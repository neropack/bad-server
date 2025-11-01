import { Request, Express } from 'express'
import multer, { diskStorage, FileFilterCallback } from 'multer'
import { extname, join } from 'path'
import sharp from 'sharp'
import fs from 'fs'
import BadRequestError from '../errors/bad-request-error'

const createDirectoryIfNotExist = (directory: string) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true })
    }
}

type DestinationCallback = (error: Error | null, destination: string) => void
type FileNameCallback = (error: Error | null, filename: string) => void

const storage = diskStorage({
    destination: (
        _req: Request,
        _file: Express.Multer.File,
        cb: DestinationCallback
    ) => {
        const uploadDir = join(
            __dirname,
            process.env.UPLOAD_PATH_TEMP
                ? `../public/${process.env.UPLOAD_PATH_TEMP}`
                : '../public'
        )

        try {
            createDirectoryIfNotExist(uploadDir)

            cb(null, uploadDir)
        } catch (err) {
            cb(
                new BadRequestError(`Не удалось создать директорию: ${err}`),
                uploadDir
            )
        }
    },
    filename: (
        _req: Request,
        file: Express.Multer.File,
        cb: FileNameCallback
    ) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
        const newFilename = uniqueSuffix + extname(file.originalname)

        cb(null, newFilename)
    },
})

const types = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/svg+xml',
]

const fileSize = {
    min: 2 * 1024,
    max: 10 * 1024 * 1024,
}

const imgMinRes = {
    width: 50,
    height: 50,
}

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    if (!types.includes(file.mimetype)) {
        // return cb(null, false)
        return cb(
            new Error(`Недопустимый тип файла. Допустимые: ${types.join(', ')}`)
        )
    }

    // return cb(null, true)
    if (file.size < fileSize.min) {
        return cb(
            new Error(
                `Размер файла слишком маленький. Минимальный размер - 2 KB`
            )
        )
    }

    sharp(file.buffer)
        .metadata()
        .then((metadata) => {
            if (
                metadata.width != null &&
                metadata.height != null &&
                (metadata.width < imgMinRes.width ||
                    metadata.height < imgMinRes.height)
            ) {
                return cb(
                    new Error(
                        `Минимальное разрешение изображения: ${imgMinRes.width}x${imgMinRes.height}px`
                    )
                )
            }

            return cb(null, true)
        })
        .catch(() => cb(new Error('Ошибка при обработке изображения')))
}

const limits = { fileSize: fileSize.max } // 10MB
export default multer({ storage, fileFilter, limits })
