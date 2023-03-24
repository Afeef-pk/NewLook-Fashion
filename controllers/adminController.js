const Admin = require('../models/adminModel')
const User = require('../models/userModel')
const Product = require('../models/productModel')
 
// load Login page
const loadAdminLogin = async (req, res) => {
    try {
        res.render("adminLogin")
    } catch (error) {
        console.log(error.message);
    }
}

//admin verify
const verifyLogin = async (req, res) => {
    try {
        const adminEmail = req.body.email
        const password = req.body.password
        const adminData = await Admin.findOne({ adminEmail: adminEmail })

        if (adminData) {
            if (password == adminData.adminPassword) {
                req.session.admin_id = adminData._id
                res.redirect('/admin/dashboard')
            } else {
                res.render('adminLogin', { message: "email and password is incorrect" })
            }
        }
        else {
            console.log('hai');
            res.render('adminLogin', { message: "email and password or incorrect" })
        }

    } catch (error) {
        console.log(error.message);
    }
}

const loadDashboard = async (req, res) => {

    try {
        const usersData = await User.find({})
        const productData = await Product.find({})
        res.render('dashboard', { users: usersData, product: productData })
    } catch (error) {
        console.log(error.message);
    }
}

const loadUser_Manage = async (req, res) => {
    try {
        var search = ''
        if (req.query.search) {
            search = req.query.search
        }

        const usersData = await User.find({
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: 'i' } },
                { email: { $regex: '.*' + search + '.*', $options: 'i' } },
                { mobile: { $regex: '.*' + search + '.*', $options: 'i' } }
            ]
        })

        res.render('User_manage.ejs', { users: usersData })
    } catch (error) {
        console.log(error.message);
    }
}

//view single  user details
const loadUserDeatails = async (req, res) => {

    try {
        const usersData = await User.findOne({ _id: req.query.id })
        res.render('single-user', { users: usersData })
    } catch (error) {
        console.log(error.message);
    }
}

//block a user
const blockUser = async (req, res) => {

    try {
       
        const block = req.body.block
        const updateInfo =await User.updateOne({ _id: req.query.id }, { $set:{is_blocked:1}})
        
        if (updateInfo) {
           res.redirect('/admin/user_manage')
        } else {
            
        }
    } catch (error) {
        console.log(error.message);
    }
}

// load products
const loadProducts = async (req, res) => {
    try {
        var search = ''
        if (req.query.search) {
            search = req.query.search
        }

        const productData = await Product.find({
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: 'i' } },
                { email: { $regex: '.*' + search + '.*', $options: 'i' } },
                { mobile: { $regex: '.*' + search + '.*', $options: 'i' } }
            ]
        })
        res.render('products', { product: productData })
    } catch (error) {
        console.log(error.message);
    }
}

const loadAddNewProduct = async (req, res) => {

    try {
        res.render('new-product')
    } catch (error) {
        console.log(error.message);
    }
}

const insertNewProduct = async (req, res) => {

    try {
        const product = new Product({
            name: req.body.name,
            price: req.body.price,
            category: req.body.category,
            quantity: req.body.quantity,
            description: req.body.description,
        })
        const productData = await product.save()
        if (productData) {
            res.redirect('/admin/product_manage')
        } else {
            res.render('products', { message: "something wrong" })
        }
    }
    catch (error) {
        console.log(error.message);
    }
}

const deleteProduct = async (req, res) => {

    try {
        const id = req.query.id
        await Product.deleteOne({ _id: id })
        res.redirect('/admin/product_manage')
    } catch (error) {
        console.log(error.message);
    }
}

const categoryManage = async (req, res) => {

    try {
        res.render('categories')
    } catch (error) {
        console.log(error.message);
    }
}

const orderListing = async (req, res) => {

    try {
       res.render('order-list')
    } catch (error) {
        console.log(error.message);
    }
}

const couponManage = async (req, res) => {

    try {
        res.render('coupons')
    } catch (error) {
        console.log(error.message);
    }
}




const logout = async (req, res) => {

    try {
        req.session.destroy()
        res.redirect('/admin')
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    loadAdminLogin,
    verifyLogin,
    loadDashboard,
    loadUser_Manage,
    loadProducts,
    logout,
    loadUserDeatails,
    loadAddNewProduct,
    insertNewProduct,
    deleteProduct,
    blockUser,
    categoryManage,
    orderListing,
    couponManage,

}