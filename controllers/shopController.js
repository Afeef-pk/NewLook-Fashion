const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const Cart = require('../models/cartModel')
const User = require('../models/userModel')
const Coupon = require('../models/couponModel')
const Order = require('../models/orderModel')

//load Landin page
const loadLandingPage = async (req, res) => {
    try {
        const productData = await Product.find()
        const userData = req.session.user_id
        //console.log(typeof userData);
        if (userData) {
            res.render("landingPage", { product: productData, userData })
        } else {
            res.render("landingPage", { product: productData })
        }
    } catch (error) {
        console.log(error.message);
    }
}

//load main  produt page
const loadProductPage = async (req, res) => {

    try {
        const category = await Category.find({}, { _id: 1 })
        const cat = category.map(category => category._id)
        const productData = await Product.find({ category: { $in: cat } }).populate('category')
        const categoryData = await Category.find({})
        res.render('products', { products: productData, categoryData })
    } catch (error) {
        console.log(error.message)
    }
}

//load single productes
const loadSingleProduct = async (req, res) => {

    try {
        const product = await Product.findById({ _id: req.query.id }).populate('category')
        const productsData = await Product.find()
        if (product) {
            res.render('single-product', { product, productsData })
        } else {
            res.sendStatus(404)
        }

    } catch (error) {
        console.log(error.message)
    }
}

//load cart
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
            // const discountNull = await Cart.findOneAndUpdate({ userID: req.session.user_id }, { $set: { discountPrice: 0 } })
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

        const discount = userCart.discountPrice

        res.json({ empty, currentTotal, sum, discount })
    } catch (error) {
        console.log(error.message)
    }
}

const applyCouponCode = async (req, res) => {
    try {
        console.log(req.body);
        const userCart = await Cart.findById({ _id: req.body.cart_id })
        const couponData = await Coupon.findOne({ couponCode: req.body.couponcode })

        let message
        if (couponData) {
            if (userCart.Total >= couponData.minAmount) {
                let discount = userCart.Total * couponData.discount / 100
                if (discount <= couponData.maxDiscount) {
                    const afterdiscount = userCart.Total - discount
                    const updateCart = await Cart.findByIdAndUpdate({ _id: req.body.cart_id }, { $set: { discountPrice: discount, discountTotal: afterdiscount } })
                    res.redirect('/cart')

                } else {
                    const afterdiscount = userCart.Total - couponData.maxDiscount
                    discount = couponData.maxDiscount
                    const updateCart = await Cart.findByIdAndUpdate({ _id: req.body.cart_id }, { discountPrice: couponData.maxDiscount, discountTotal: afterdiscount })
                    res.redirect('/cart')
                }
            } else {
                message = 'Minimum Purchase value of this coupon is' + couponData.minAmount
                res.json(message)
            }
        } else {
            message = 'Invalid Coupon Code'
            res.json(message)
        }
    } catch (error) {
        console.log(error.message)
    }
}

//load checkout page
const loadCheckOutPage = async (req, res) => {

    try {
        const user = await User.findOne({ _id: req.session.user_id })
        const userCart = await Cart.findOne({ userID: req.session.user_id })

        res.render('checkout', { user, userCart })
    } catch (error) {
        console.log(error.message)
    }
}

const orderplaced = async (req, res) => {
    try {
        const userCart = await Cart.findOne({ userID: req.session.user_id })
        const user = await User.findById({ _id: req.session.user_id })
        const orderData = await Order.findOne({ userID: req.session.user_id })

        if (orderData) {
            const orderDeatails = await Order.findOneAndUpdate({ userID: req.session.user_id }, { $push: { orders: userCart.products } })
        } else {
            const order = new Order({
                createdAt: Date(),
                userID: req.session.user_id,
                orders: userCart.products,
                address: user.address[req.body.address],
                paymentMethod: req.body.payment,
                paymentStatus: 'succes',
                orderStatus: 'pending'
            })
            const orderSave = await order.save()
        }

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
        res.render('order-placed')
    } catch (error) {
        console.log(error)
    }
}

//load order details page
const loadOrder = async (req, res) => {

    try {
        const orderDeatails = await Order.findOne({ userID: req.session.user_id })
        const orderedProducts = orderDeatails.orders
        const userOrderedProductId = orderedProducts.map(values => values.productID)
      
        const product = await Product.aggregate([
            {
                $match: {
                    _id: { $in: userOrderedProductId }
                }
            }, {
                $project: {
                    name: 1,
                    image: 1,
                    price: 1,
                    cartOrder: { $indexOfArray: [userOrderedProductId, "$_id"] }
                }
            },
            { $sort: { cartOrder: 1 } }
        ]) 

       console.log(product);
      // console.log(product[1].name);
        res.render('orders', { product,orderDeatails })

    } catch (error) {
        console.log(error.message)
    }
}

//load WishList page
const loadWishList = async (req, res) => {

    try {

        res.render('wishlist')


    } catch (error) {
        console.log(error.message)
    }
}

//load contact page
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
    addingToCart,
    removeFromCart,
    loadCart,
    //increaseAmout,
    changeQuantity,
    applyCouponCode,
    loadOrder,
    loadWishList,
    loadContact,
    loadCheckOutPage,
    orderplaced
}