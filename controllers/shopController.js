//load Landin page
const loadLandingPage = async (req, res) => {

    try {
        res.render("landingPage")
    } catch (error) {
        console.log(error.message);
    }
}

//load main  produt page
const loadProductPage = async (req, res) => {

    try {

        res.render('products')
    } catch (error) {
        console.log(error.message)
    }
}

//load single productes
const loadSingleProduct = async (req, res) => {

    try {

        res.render('cart')
    } catch (error) {
        console.log(error.message)
    }
}

//load cart
const loadCart = async (req, res) => {

    try {

        res.render('cart')
    } catch (error) {
        console.log(error.message)
    }
}

//load order details page
const loadOrder = async (req, res) => {

    try {

        res.render('cart')
    } catch (error) {
        console.log(error.message)
    }
}

//load WishList page
const loadWishList = async (req, res) => {

    try {

        res.render('cart')
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

//load checkout page
const loadCheckOutPage = async (req, res) => {

    try {

        res.render('checkout')
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    loadLandingPage,
    loadProductPage,
    loadSingleProduct,
    loadCart,
    loadOrder,
    loadWishList,
    loadContact,
    loadCheckOutPage
}