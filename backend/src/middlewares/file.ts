import { Request, Express } from 'express'
import multer, { diskStorage, FileFilterCallback } from 'multer'
import { extname, join } from 'path'
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

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    if (!types.includes(file.mimetype)) {
        const ext = types.map((type) => type.split('/')[1])

        return cb(
            new BadRequestError(
                `Недопустимый тип файла. Допустимые типы: .${ext.join(', .')}`
            )
        )
    }

    return cb(null, true)
}

export default multer({ storage, fileFilter })
