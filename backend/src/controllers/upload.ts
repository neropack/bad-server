import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import BadRequestError from '../errors/bad-request-error'
import sharp from 'sharp'
import { fileSizeLimits, imgMinRes } from '../utils/sizes'

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.file) {
            return next(new BadRequestError('Файл не загружен'))
        }

        if (req.file.size < fileSizeLimits.min) {
            return next(new BadRequestError(`Размер файла слишком маленький. Минимальный размер - 2 KB`))
        }

        if (req.file.size > fileSizeLimits.max) {
            return next(new BadRequestError(`Размер файла слишком большой. Максимальный размер - 10 МB`))
        }

        const metadata = await sharp(req.file.path).metadata()
        if (metadata.width != null && metadata.height != null &&
            (metadata.width < imgMinRes.width || metadata.height < imgMinRes.height)) {
            return next(new BadRequestError(`Минимальное разрешение изображения - ${imgMinRes.width}x${imgMinRes.height}px`))
        }

        const fileName = process.env.UPLOAD_PATH
            ? `/${process.env.UPLOAD_PATH}/${req.file.filename}`
            : `/${req.file?.filename}`
        return res.status(constants.HTTP_STATUS_CREATED).send({
            fileName,
            originalName: req.file?.originalname,
        })
    } catch (error) {
        return next(error)
    }
}

export default {}
