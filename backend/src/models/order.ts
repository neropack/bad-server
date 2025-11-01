/* eslint-disable prefer-arrow-callback */
import mongoose, { Document, Schema, Types } from 'mongoose'
import validator from 'validator'
import { PaymentType, phoneRegExp } from '../middlewares/validations'
import Counter from './counter'
import User, { IUser } from './user'

export enum StatusType {
    Cancelled = 'cancelled',
    Completed = 'completed',
    New = 'new',
    Delivering = 'delivering',
}

export interface IOrder extends Document {
    _id: Types.ObjectId
    orderNumber: number
    status: StatusType
    totalAmount: number
    products: Types.ObjectId[]
    payment: PaymentType
    customer: Types.ObjectId
    deliveryAddress: string
    phone: string
    comment: string
    email: string
}

const orderSchema: Schema = new Schema(
    {
        orderNumber: { type: Number, unique: true },
        status: {
            type: String,
            enum: Object.values(StatusType),
            default: StatusType.New,
        },
        totalAmount: { type: Number, required: true },
        products: [
            {
                type: Types.ObjectId,
                ref: 'product',
            },
        ],
        payment: {
            type: String,
            enum: Object.values(PaymentType),
            required: true,
        },
        customer: { type: Types.ObjectId, ref: 'user' },
        deliveryAddress: { type: String },
        email: {
            type: String,
            required: [true, 'Поле "email" должно быть заполнено'],
            validate: {
                validator: (v: string) => validator.isEmail(v),
                message: 'Поле "email" должно быть валидным email-адресом',
            },
        },
        phone: {
            type: String,
            maxlength: 15,
            required: [true, 'Поле "phone" должно быть заполнено'],
            validate: [
                {
                    validator: (v: string) => phoneRegExp.test(v),
                    message: 'Поле "phone" должно быть валидным телефоном.',
                },
            ],
        },
        comment: {
            type: String,
            default: '',
        },
    },
    { versionKey: false, timestamps: true }
)

orderSchema.pre(
    'save',
    async function incrementOrderNumber(this: IOrder, next) {
        if (this.isNew) {
            const counter = await Counter.findOneAndUpdate(
                {},
                { $inc: { sequenceValue: 1 } },
                { new: true, upsert: true }
            )

            this.orderNumber = counter.sequenceValue
        }

        next()
    }
)

orderSchema.post('save', async function updateUserStats(doc: IOrder) {
    const user = (await User.findById(doc.customer)) as IUser | null

    if (user) {
        user.orders.push(doc._id)
        await user.calculateOrderStats()
    }
})

orderSchema.post(
    'findOneAndDelete',
    async function updateUserStats(order: IOrder) {
        const user = await User.findByIdAndUpdate(order.customer, {
            $pull: { orders: order._id },
        })

        if (user) {
            await user.calculateOrderStats()
        }
    }
)

export default mongoose.model<IOrder>('order', orderSchema)
