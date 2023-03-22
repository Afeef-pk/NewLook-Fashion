const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const Cart = require('../models/cartModel')
const User = require('../models/userModel')
const Coupon = require('../models/couponModel')
const Order = require('../models/orderModel')
const Wishlist = require('../models/wishlistModel')

const loadLandingPage = async (req, res) => {
    try {
        const productData = await Product.find()
        const userData = req.session.user_id
        let userCart
        if (req.session.user_id) {
            userCart = await Cart.findOne({ userID: req.session.user_id })
        }

        if (userData) {
            res.render("landingPage", { product: productData, userData, userCart })
        } else {
            res.render("landingPage", { product: productData })
        }
    } catch (error) {
        console.log(error.message);
    }
}

const loadProductPage = async (req, res) => {

    try {
        const category = await Category.find({}, { _id: 1 })
        const cat = category.map(category => category._id)
        const productData = await Product.find({ category: { $in: cat } }).populate('category')
        const categoryData = await Category.find({})
        let userCart
        if (req.session.user_id) {
            userCart = await Cart.findOne({ userID: req.session.user_id })
        }
        res.render('products', { products: productData, categoryData, userCart })
    } catch (error) {
        console.log(error.message)
    }
}

const loadSingleProduct = async (req, res) => {

    try {
        let userCart
        if (req.session.user_id) {
            userCart = await Cart.findOne({ userID: req.session.user_id })
        }
        const product = await Product.findById({ _id: req.query.id }).populate('category')
        const productsData = await Product.find()
        if (product) {
            res.render('single-product', { product, productsData, userCart })
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

        const product = {
            productID: singleProduct._id,
            name: singleProduct.name,
            price: singleProduct.price
        }

        var Exist = false
        var newItem = false

        if (userWishlist) {
            console.log(req.body.productID);
            const itemExist = await Wishlist.findOne({ userID: req.session.user_id, "products.productID": req.body.productID })
            if (itemExist) {
                console.log('already');
                Exist = true
            } else {
                console.log('pudiyad vannu');
                const updateWishlist = await Wishlist.updateOne({ userID: req.session.user_id }, { $push: { products: product } })
                newItem = true
            }
            res.json({ Exist, newItem })
        } else {
            const wishlist = new Wishlist({
                userID: req.session.user_id,
                products: product
            })
            const wishlistData = await wishlist.save()
            if (wishlistData) {
                res.redirect('/shop')
            } else {
                res.sendStatus(404)
            }
        }
    } catch (error) {
        console.log(error.message)
    }
}

const loadWishList = async (req, res) => {

    try {
        const wishlistData = await Wishlist.findOne({ userID: req.session.user_id })
        const pid = wishlistData.products

        const wishlistProductsId = pid.map(values => values.productID)
        console.log(wishlistProductsId);
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
        console.log(products);
        res.render('wishlist', { products })
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

    } catch (error) {
        console.log(error.message)
    }
}

const loadCart = async (req, res) => {
    try {
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        let count = 0
        if (userCart) {
            const cartProducts = userCart.products
            const userCartProductsId = cartProducts.map(values => values.productID)
            const products = await Product.aggregate([
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
            count = products.length
            res.render('cart', { products, userCart, count })
        } else {
            res.render('cart', { count })
        }
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
                },
                $set: {
                    discountPrice: 0
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
        const user = await User.findOne({ _id: req.session.user_id })
        const userCart = await Cart.findById({ _id: req.body.cartID })
        const couponData = await Coupon.findOne({ couponCode: req.body.couponCode })
        const alreadyDicountThenRemove = userCart.discountPrice
        if (alreadyDicountThenRemove == 0) {
           
            let message;
            if (couponData) {
                if (userCart.Total >= couponData.minAmount) {
                    var removed = false
                    let discount = userCart.Total * couponData.discount / 100
                    if (discount <= couponData.maxDiscount) {
                        const afterdiscount = userCart.Total - discount
                        const updateCart = await Cart.findByIdAndUpdate({ _id: req.body.cartID }, { $set: { discountPrice: discount, discountTotal: afterdiscount } })
                        message = 'Coupons Succesfully Applied'
                        res.send({ discountAmount: discount, message: message, removed,afterdiscount })
                    } else {
                        const afterdiscount = userCart.Total - couponData.maxDiscount
                        discount = couponData.maxDiscount
                        const updateCart = await Cart.findByIdAndUpdate({ _id: req.body.cartID }, { discountPrice: couponData.maxDiscount, discountTotal: afterdiscount })
                        message = 'Coupons maximum amount Succesfully Applied'
                        res.send({ discountAmount: discount, message: message, removed,afterdiscount })
                    }
                } else {
                    message = 'Minimum Purchase value of this coupon is ' + couponData.minAmount
                    let minimum= true
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
        res.render('checkout', { user, userCart })
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
            address: req.body.address,
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
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        const user = await User.findById({ _id: req.session.user_id })
        const total = userCart.Total - userCart.discountPrice
        const order = new Order({
            createdAt: Date(),
            userID: req.session.user_id,
            products: userCart.products,
            address: user.address[req.body.address],
            Total: total,
            paymentMethod: req.body.payment,
            paymentStatus: 'pending',
            orderStatus: 'pending'
        })
        const orderSave = await order.save()

        const updateUserCart = await Cart.findOneAndUpdate({ userID: req.session.user_id },
            {
                $set: {
                    products: [],
                    Total: 0,
                    discountPrice: 0,
                    discountTotal: 0
                }
            }
        )
        if (orderSave) {
            res.render('order-placed')
        } else {
            res.render('404')
        }

    } catch (error) {
        console.log(error)
    }
}

const loadOrder = async (req, res) => {

    try {
        const orderDeatails = await Order.find({ userID: req.session.user_id })
        const orderedProducts = await Order.aggregate([
            {
                $match: { userID: req.session.user_id }
            }

        ])

        console.log(orderDeatails);
        console.log(orderedProducts);
        res.render('orders', {})

    } catch (error) {
        console.log(error.message)
    }
}

const loadContact = async (req, res) => {

    try {
        res.render('contact')
    } catch (error) {
        console.log(error.message)
    }
}



module.exports = {
    loadLandingPage,
    loadProductPage,
    loadSingleProduct,
    loadWishList,
    addToWishList,
    removeFromWishlist,
    addingToCart,
    removeFromCart,
    loadCart,
    changeQuantity,
    applyCouponCode,
    loadOrder,
    loadContact,
    loadCheckOutPage,
    saveCheckOutAddress,
    orderplaced
}