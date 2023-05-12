const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const Cart = require('../models/cartModel')
const User = require('../models/userModel')
const Coupon = require('../models/couponModel')
const Order = require('../models/orderModel')
const Wishlist = require('../models/wishlistModel')
const nodemailer = require("nodemailer")
const env = require('dotenv').config();
const { ObjectId } = require('mongodb')
const Razorpay = require('razorpay')
const crypto = require('crypto')
const { log } = require('console')
var instance = new Razorpay({
    key_id: process.env.razorpayKeyId,
    key_secret: process.env.razorpayKeySecret,
});

const loadLandingPage = async (req, res) => {
    try {
        const category = await Category.find({}, { _id: 1 })
        const categoryId = category.map(category => category._id)
        const product = await Product.find({ category: { $in: categoryId } }).populate('category')
        const categoryData = await Category.find({})
        const userData = req.session.user_id
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        const wishlist = await Wishlist.findOne({ userID: req.session.user_id })
        res.render("landingPage", { product, userData, userCart, wishlist, categoryData })
    } catch (error) {
        console.log(error.message);
    }
}

const loadProductPage = async (req, res) => {
    try {
        const categoryData = await Category.find({})
        const userData = req.session.user_id
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        const wishlist = await Wishlist.findOne({ userID: req.session.user_id })
        const category = await Category.find({}, { _id: 1 })
        const categoryId = category.map(category => category._id)

        var search = ''
        if (req.query.search) {
            search = req.query.search
        }
        var page = 1
        let next = page + 1
        if (req.query.page) {
            page = req.query.page
        }
        const limit = 8


        const products = await Product.find({
            disabled: false,
            category: { $in: categoryId },
            name: { $regex: '.*' + search + '.*', $options: 'i' },

        }).populate('category').limit(limit * 1).skip((page - 1) * limit).exec()

        const count = await Product.find({ disabled: false }).countDocuments()
        res.render('products', {
            products,
            categoryData,
            userCart,
            wishlist,
            userData,
            totalPages: Math.ceil(count / limit),
            previousPage: page - 1,
            currentPage: page,
            nextPage: next
        })
    } catch (error) {
        console.log(error.message)
    }
}

const loadSingleProduct = async (req, res) => {

    try {
        const userData = req.session.user_id
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        const wishlist = await Wishlist.findOne({ userID: req.session.user_id })
        if (wishlist) {
            const userProducts = wishlist.products
            var wishlistExist = userProducts.find(obj => obj.productID == req.query.id);
        }
        const product = await Product.findById({ _id: req.query.id }).populate('category')
        const productsData = await Product.find()
        if (product) {
            res.render('single-product', { product, productsData, userData, userCart, wishlist, wishlistExist })
        } else {
            res.sendStatus(404)
        }
    } catch (error) {
        console.log(error.message)
    }
}

const addToWishList = async (req, res) => {
    try {
        const singleProduct = await Product.findOne({ _id: req.body.productID })
        const userWishlist = await Wishlist.findOne({ userID: req.session.user_id })
        const count = userWishlist.products.length
        const product = {
            productID: singleProduct._id,
            name: singleProduct.name,
            price: singleProduct.price
        }
        var addedToWishList, alreadyExist = false
        if (userWishlist) {
            const itemExist = await Wishlist.findOne({ userID: req.session.user_id, "products.productID": req.body.productID })
            if (!itemExist) {
                const updateWishlist = await Wishlist.updateOne({ userID: req.session.user_id }, { $push: { products: product } })
                res.send({ addedToWishList: true, count })
            } else {
                const updateWishlist = await Wishlist.findByIdAndUpdate(
                    { _id: userWishlist._id },
                    { $pull: { products: { productID: req.body.productID } } })
                res.send({ alreadyExist: true, count })
            }
        } else {
            const wishlist = new Wishlist({
                userID: req.session.user_id,
                products: product
            })
            const wishlistData = await wishlist.save()
            res.send({ addedToWishList: true, count })
        }
    } catch (error) {
        console.log(error.message)
    }
}

const cartAddWishlist = async (req, res) => {
    try {
        const productData = await Product.findOne({ _id: req.query.id })
        const userWishlist = await Wishlist.findOne({ userID: req.session.user_id })
        const product = {
            productID: productData._id,
            name: productData.name,
            price: productData.price
        }
        if (userWishlist) {
            const itemExist = await Wishlist.findOne({ userID: req.session.user_id, "products.productID": req.query.id })
            console.log(itemExist);
            if (!itemExist) {
                const updateWishlist = await Wishlist.updateOne({ userID: req.session.user_id }, { $push: { products: product } })
                const userCart = await Cart.findOne({ userID: req.session.user_id })
                const removedProduct = userCart.products.find(item => item.productID == req.query.id)
                const updateCart = await Cart.findByIdAndUpdate(
                    { _id: userCart._id },
                    {
                        $pull:
                            { products: { productID: req.query.id } },
                        $inc: { Total: -removedProduct.price }
                    })
                res.redirect('/cart')
            } else {
                res.redirect('/cart')
            }
        } else {
            const wishlist = new Wishlist({
                userID: req.session.user_id,
                products: product
            })
            const wishlistData = await wishlist.save()
            res.redirect('/cart')
        }
    } catch (error) {
        console.log(error.message)
    }
}

const loadWishList = async (req, res) => {

    try {
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        const wishlist = await Wishlist.findOne({ userID: req.session.user_id })
        const pid = wishlist.products
        const wishlistProductsId = pid.map(values => values.productID)
        const products = await Product.aggregate([
            {
                $match: {
                    _id: { $in: wishlistProductsId }
                }
            }, {
                $project: {
                    name: 1,
                    image: 1,
                    price: 1,
                    order: { $indexOfArray: [wishlistProductsId, "$_id"] }
                }
            },
            { $sort: { order: 1 } }
        ])
        const count = products.length
        res.render('wishlist', { products, count, userCart, wishlist })
    } catch (error) {
        console.log(error.message)
    }
}

const removeFromWishlist = async (req, res) => {
    try {
        const userWishlist = await Wishlist.findOne({ userID: req.session.user_id })
        const removedProduct = userWishlist.products.find(item => item.productID == req.query.id)
        const updateWishlist = await Wishlist.findByIdAndUpdate(
            { _id: userWishlist._id },
            {
                $pull:
                {
                    products:
                        { productID: req.query.id }
                }
            })
        if (updateWishlist) {
            res.redirect('/wishlist')
        } else {
            res.render('404')
        }
    } catch (error) {
        console.log(error.message)
    }
}

const addingToCart = async (req, res) => {

    try {
        const singleProduct = await Product.findOne({ _id: req.query.id })
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        const product = {
            productID: req.query.id,
            name: singleProduct.name,
            price: singleProduct.price,
            quantity: 1
        }
        let wishExist = await Wishlist.findOne({ userID: req.session.user_id, 'products.productID': req.query.id })
        if (wishExist) {
            await Wishlist.findOneAndUpdate({ userID: req.session.user_id },
                {
                    $pull:
                        { products: { productID: req.query.id } }
                })
        }
        if (singleProduct.stock > 0) {
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.productID == req.query.id)
                if (proExist != -1) {
                    const checkProduct = await Cart.updateOne({ userID: req.session.user_id, 'products.productID': req.query.id },
                        {
                            $inc: { 'products.$.quantity': 1, 'products.$.price': singleProduct.price, Total: singleProduct.price }
                        }
                    )
                    res.redirect('/cart')
                } else {
                    const newProduct = await Cart.findByIdAndUpdate({ _id: userCart._id }, { $push: { products: product } })
                    const total = await Cart.findByIdAndUpdate({ _id: userCart._id }, { Total: userCart.Total + singleProduct.price })
                    res.redirect('/cart')
                }
            } else {
                const cart = new Cart({
                    products: product,
                    userID: req.session.user_id,
                    Total: singleProduct.price,
                })
                const cartData = await cart.save()
                if (cartData) {
                    res.redirect('/cart')
                } else {
                    res.sendStatus(404)
                }
            }
        } else {
            res.redirect('/shop')
        }
    } catch (error) {
        console.log(error.message)
    }
}

const loadCart = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ userID: req.session.user_id })
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        if (userCart != null) {
            const cartProducts = userCart.products
            const userCartProductsId = cartProducts.map(values => values.productID)
            var products = await Product.aggregate([
                {
                    $match: {
                        _id: { $in: userCartProductsId }
                    }
                }, {
                    $project: {
                        name: 1,
                        image: 1,
                        price: 1,
                        cartOrder: { $indexOfArray: [userCartProductsId, "$_id"] }
                    }
                },
                { $sort: { cartOrder: 1 } }
            ])
            var count = products.length
        } else {
            count = 0
        }
        res.render('cart', { products, userCart, count, wishlist })
    } catch (error) {
        console.log(error.message)
    }
}

const removeFromCart = async (req, res) => {
    try {
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        const removedProduct = userCart.products.find(item => item.productID == req.query.id)
        const updateCart = await Cart.findByIdAndUpdate(
            { _id: userCart._id },
            {
                $pull:
                {
                    products:
                        { productID: req.query.id }
                },
                $inc: {
                    Total: -removedProduct.price,
                }
            })
        res.redirect('/cart')
    } catch (error) {
        console.log(error.message)
    }
}

const changeQuantity = async (req, res) => {
    try {
        const productData = await Product.findOne({ _id: req.body.product })
        const count = parseInt(req.body.count)
        const quantity = parseInt(req.body.quantity)
        let currentTotal = parseInt(req.body.currentTotal)
        let empty = false
        if (count == -1 && quantity == 1) {
            let removeItemFromcart = await Cart.updateOne({ _id: req.body.cart },
                {
                    $pull: { products: { productID: req.body.product } }
                })
            empty = true
        } else {
            let changeQuantity = await Cart.updateOne({ _id: req.body.cart, 'products.productID': req.body.product },
                {
                    $inc: { 'products.$.quantity': count }
                })

            if (count == 1) {
                currentTotal = productData.price + currentTotal
                let increaseTotalPrice = await Cart.updateOne({ _id: req.body.cart, 'products.productID': req.body.product },
                    {
                        $set: {
                            'products.$.price': currentTotal
                        }
                    })
            } else {
                currentTotal = currentTotal - productData.price
                let decreaseTotalPrice = await Cart.updateOne({ _id: req.body.cart, 'products.productID': req.body.product },
                    {
                        $set: {
                            'products.$.price': currentTotal
                        }
                    })
            }
            empty = false
        }
        const userCart = await Cart.findOne({ _id: req.body.cart })
        let sum = userCart.products.reduce((acc, cur) => {
            return acc += cur.price;
        }, 0)
        const updateTotalPrice = await Cart.findByIdAndUpdate({ _id: req.body.cart },
            {
                $set: { Total: sum }
            }
        )
        res.json({ empty, currentTotal, sum })
    } catch (error) {
        console.log(error.message)
    }
}

const applyCouponCode = async (req, res) => {
    try {
        const userCart = await Cart.findById({ _id: req.body.cartID })
        const couponData = await Coupon.findOne({ couponCode: req.body.couponCode })
        if (couponData) {
            var userAlreadyUsed = couponData.users.find(item => item.userID == req.session.user_id)
        }
        if (userCart.discountPrice == 0) {
            let message;
            if (couponData && couponData.count > 0 && !userAlreadyUsed) {
                if (userCart.Total >= couponData.minAmount) {
                    var removed = false
                    let discount = userCart.Total * couponData.discount / 100
                    if (discount <= couponData.maxDiscount) {
                        const afterdiscount = userCart.Total - discount
                        const updateCart = await Cart.findByIdAndUpdate({ _id: req.body.cartID }, { $set: { discountPrice: discount } })
                        message = 'Coupon Succesfully Applied'
                        res.send({ discountAmount: discount, message: message, removed, afterdiscount })
                    } else {
                        const afterdiscount = userCart.Total - couponData.maxDiscount
                        discount = couponData.maxDiscount
                        const updateCart = await Cart.findByIdAndUpdate({ _id: req.body.cartID }, { discountPrice: couponData.maxDiscount })
                        message = 'Coupon maximum Discount Succesfully Applied'
                        res.send({ discountAmount: discount, message: message, removed, afterdiscount })
                    }
                } else {
                    message = 'Minimum Purchase value of this coupon is ' + couponData.minAmount
                    let minimum = true
                    res.send({ message: message, minimum })
                }
            } else {
                message = 'Invalid Coupon Code'
                let invalid = true
                res.send({ message: message, invalid })
            }
        } else {
            const discountRemove = await Cart.findByIdAndUpdate({ _id: req.body.cartID }, { $set: { discountPrice: 0 } })
            removed = true
            res.send({ removed })
        }
    } catch (error) {
        console.log(error.message)
    }
}

const loadCheckOutPage = async (req, res) => {

    try {
        const user = await User.findOne({ _id: req.session.user_id })
        const discountRemove = await Cart.findOneAndUpdate({ userID: req.session.user_id }, { $set: { discountPrice: 0 } })
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        const wishlist = await Wishlist.findOne({ userID: req.session.user_id })
        res.render('checkout', { user, userCart, wishlist })
    } catch (error) {
        console.log(error.message)
    }
}

const saveCheckOutAddress = async (req, res) => {

    try {
        const address = {
            name: req.body.name,
            pincode: req.body.pincode,
            landmark: req.body.landmark,
            address: req.body.newAddress,
            mobile: req.body.phone
        }
        const userData = await User.findByIdAndUpdate(
            { _id: req.session.user_id },
            {
                $push: {
                    address: {
                        ...address
                    }
                }
            })

        if (userData) {
            res.redirect('/checkout')
        } else {
            res.sendStatus(404)
        }
    } catch (error) {
        console.log(error.message)
    }
}

const orderplaced = async (req, res) => {
    try {
        const couponUsed = {
            userID: req.session.user_id
        }
        const decreaseCouponCount = await Coupon.findOneAndUpdate({ couponCode: req.body.couponValue }, { $inc: { count: -1 }, $push: { users: couponUsed } })

        const userCart = await Cart.findOne({ userID: req.session.user_id })
        const user = await User.findById({ _id: req.session.user_id })
        const total = userCart.Total - userCart.discountPrice
        const currentDate = new Date();
        const orderDate = currentDate.toISOString().slice(0, 19)
        const paymentStatus = req.body.paymentMethod === 'Cash On Delivery' ? 'pending' :'online'

        const order = new Order({
            orderDate: orderDate,
            userID: req.session.user_id,
            products: userCart.products,
            address: user.address[req.body.address],
            Total: total,
            paymentMethod: req.body.paymentMethod,
            paymentStatus: paymentStatus,
            orderStatus: 'Placed',
            arrivalDate:''
        })
        var orderSave = await order.save()

        if (req.body.paymentMethod == 'Cash On Delivery') {
            res.json({ Status: true })
        } else {
            var options = {
                amount: total * 100,
                currency: "INR",
                receipt: '' + orderSave._id
            };
            instance.orders.create(options, function (err, order) {
                res.json({ order })
            });
        }
    } catch (error) {
        console.log(error)
    }
}

const verifyPayment = async (req, res) => {
    try {
        const payment = req.body.payment
        const order = req.body.order
        const secret = 'vK70i8djjOB3NsMeeUK5BTgu'
        const hmac_sha256 = (data, secret) => {
            return crypto.createHmac('sha256', secret)
                .update(data)
                .digest('hex')
        }
        const generated_signature = hmac_sha256(order.id + "|" + payment.razorpay_payment_id, secret);
        if (generated_signature == payment.razorpay_signature) {
            console.log('payment success');
            const updatePaymentStatus = await Order.findByIdAndUpdate({ _id: order.receipt }, { $set: { paymentStatus: 'completed' } })
            res.json({ Status: true })
        } else {
            const removeOrder = await Order.findOneAndDelete({ $and: [{ _id: order.receipt }, { paymentStatus: 'pending' }] })
            console.log('Payment Failed');
        }
    } catch (error) {
        console.log(error)
    }
}

const loadOrderPlacedPage = async (req, res) => {
    try {
        const order = await Order.findOne({ userID: req.session.user_id }).sort({ createdAt: -1 }).limit(1)
        const wishlist = await Wishlist.findOne({ userID: req.session.user_id })
        const discount  = await Cart.findOne({userID : req.session.user_id})
        const updateUserCart = await Cart.findOneAndUpdate({ userID: req.session.user_id },
            {
                $set: {
                    products: [],
                    Total: 0,
                    discountPrice: 0
                }
            })
        for (const product of order.products) {
            const collectionProduct = await Product.findOne({ _id: product.productID })
            const newStock = collectionProduct.stock - product.quantity
            const update = await Product.findByIdAndUpdate(
                { _id: product.productID },
                { stock: newStock })
        }
        res.render('order-placed', { order, wishlist,discount })
    } catch (error) {
        console.log(error);
    }
}

const loadUserOrders = async (req, res) => {

    try {
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        const wishlist = await Wishlist.findOne({ userID: req.session.user_id })
        const orderedProducts = await Order.find({ userID: req.session.user_id }).populate('products.productID').sort({ createdAt: -1 })
        res.render('orders', { userCart, wishlist, orderedProducts })
    } catch (error) {
        console.log(error.message)
    }
}

const loadSingleOrderDetails = async (req, res) => {

    try {
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        const wishlist = await Wishlist.findOne({ userID: req.session.user_id })
        const order = await Order.findOne({ _id: req.query.id }).populate('products.productID')
        console.log(order);
        res.render('order-details', { userCart, order, wishlist })
    } catch (error) {
        console.log(error.message)
    }
}

const cancelOrder = async (req,res)=>{
    try {
        const order = await Order.findById({_id : req.query.id})
        for (const product of order.products) {
            const collectionProduct = await Product.findOne({ _id: product.productID })
            const newStock = collectionProduct.stock + product.quantity
            const update = await Product.findByIdAndUpdate(
                { _id: product.productID },
                { stock: newStock })
        }
        const cancelOrder = await Order.findByIdAndUpdate({_id : req.query.id},{orderStatus:'Cancelled'})
        res.redirect('/orders')
    } catch (error) {
        console.log(error.message)
    }
}

const loadContact = async (req, res) => {

    try {

        const userData = await User.findOne({ _id: req.session.user_id })
        const wishlist = await Wishlist.findOne({ userID: req.session.user_id })
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        res.render('contact', { userData, userCart, wishlist })
    } catch (error) {
        console.log(error.message)
    }
}

const submitContactForm = async (req, res) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.email,
                pass: process.env.emailPass
            }
        })
        const mailOptions = {
            from: req.body.email,
            to: process.env.email,
            subject: req.body.email,
            text: `Contact Form of Your Fashion Store ${req.body.msg} `
        }
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                res.redirect('/contact')
            } else {
                console.log("Email has been sent:- ", info.response);
            }
        })
        let sts = true
        res.json({ sts })
    } catch (error) {

    }
}


module.exports = {
    loadLandingPage,
    loadProductPage,
    loadSingleProduct,
    loadWishList,
    addToWishList,
    removeFromWishlist,
    cartAddWishlist,
    addingToCart,
    removeFromCart,
    loadCart,
    changeQuantity,
    applyCouponCode,

    loadCheckOutPage,
    saveCheckOutAddress,
    orderplaced,
    verifyPayment,
    loadOrderPlacedPage,
    loadUserOrders,
    loadSingleOrderDetails,
    cancelOrder,
    loadContact,
    submitContactForm,
}