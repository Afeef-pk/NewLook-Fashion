const Admin = require('../models/adminModel')
const User = require('../models/userModel')
const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const Coupon = require('../models/couponModel')
const Order = require('../models/orderModel')
const { name } = require('twilio')

const loadAdminLogin = async (req, res) => {
    try {
        res.render("adminLogin")
    } catch (error) {
        console.log(error.message);
    }
}

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
            res.render('adminLogin', { message: "email and password or incorrect" })
        }

    } catch (error) {
        console.log(error.message);
    }
}

const loadDashboard = async (req, res) => {

    try {
        const usersData = await User.find()
        const productData = await Product.find()
        const orders = await Order.find().populate('userID')
        const totalSale = await Order.aggregate([
            {
                $match : {
                   paymentStatus : "completed"
                }
            },
            {
                $group:
                {
                    _id: null,
                    total: { $sum: '$Total' }
                }
            },
            { $project: { _id: 0, total: 1 } }
        ])
       console.log(totalSale);
        const recentOrders = await Order.aggregate([
            {
                $match: { paymentStatus: "completed" }
            },
            {
                $lookup:
                {
                    from: "users",
                    localField: "userID",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $unwind: "$user"
            }
        ])
        res.render('dashboard', { users: usersData, product: productData, orders, totalSale, recentOrders })
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

const loadUserDeatails = async (req, res) => {

    try {
        const usersData = await User.findOne({ _id: req.query.id })
        res.render('single-user', { users: usersData })
    } catch (error) {
        console.log(error.message);
    }
}

const blockUser = async (req, res) => {

    try {
        if (req.body.flexRadioDefault == 1) {
            const updateInfo = await User.updateOne({ _id: req.body.user_id }, { $set: { is_blocked: 1 } })
            res.redirect('/admin/user_manage')
        } else {
            const updateInfo = await User.updateOne({ _id: req.body.user_id }, { $set: { is_blocked: 0 } })
            res.redirect('/admin/user_manage')
        }

    } catch (error) {
        console.log(error.message);
    }
}

const loadProducts = async (req, res) => {
    try {
        let search = ''
        if (req.query.search) {
            search = req.query.search
        }
        const category = await Category.find({}, { _id: 1 })
        const cat = category.map(category => category._id)
        const product = await Product.find({
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: 'i' } }]
        }).populate('category')

        res.render('products', { product })
    } catch (error) {
        console.log(error.message);
    }
}

const loadAddNewProduct = async (req, res) => {

    try {
        const categoryData = await Category.find()
        res.render('new-product', { category: categoryData })
    } catch (error) {
        console.log(error.message);
    }
}

const insertNewProduct = async (req, res) => {

    try {
        let imageFile = []
        for (let i = 0; i < req.files.length; i++) {
            imageFile[i] = req.files[i].filename
        }
        const product = new Product({
            name: req.body.name,
            price: req.body.price,
            category: req.body.category,
            image: imageFile,
            stock: req.body.stock,
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

const loadProductDeatails = async (req, res) => {

    try {
        const productData = await Product.findOne({ _id: req.query.id }).populate('category')
        res.render('single-product', { product: productData })
    } catch (error) {
        console.log(error.message);
    }
}

const loadEditProduct = async (req, res) => {

    try {
        const id = req.query.id
        const productData = await Product.findById({ _id: id }).populate('category')
        const categoryData = await Category.find({})
        if (productData) {
            res.render('edit-product', { product: productData, category: categoryData })
        } else {
            res.redirect('/admin/product_manage')
        }
    } catch (error) {
        console.log(error.message);
    }
}

const updateProduct = async (req, res) => {

    try {
        if (req.files.length > 0) {
            let imageFile = []
            for (let i = 0; i < req.files.length; i++) {
                imageFile[i] = req.files[i].filename
            }
            const productData = await Product.findByIdAndUpdate({ _id: req.body.product_id }, { $set: { image: imageFile } })
        }
        const productData = await Product.findByIdAndUpdate({ _id: req.body.product_id }, { $set: { name: req.body.name, price: req.body.price, category: req.body.category, stock: req.body.stock, description: req.body.description } })
        if (productData) {
            res.redirect('/admin/product_manage')
        } else {
            res.sendstatus(400)
        }
    } catch (error) {
        console.log(error.message);
    }
}

const deleteProduct = async (req, res) => {

    try {
        const id = req.query.id
        const product = await Product.findOne({ _id: id })
        if (product.disabled) {
            await Product.updateOne({ _id: id }, { $set: { disabled: false } })
        } else {
            await Product.updateOne({ _id: id }, { $set: { disabled: true } })
        }
        res.redirect('/admin/product_manage')
    } catch (error) {
        console.log(error.message);
    }
}

const categoryManage = async (req, res) => {

    try {
        const categoryData = await Category.find({})
        res.render('categories', { category: categoryData })
    } catch (error) {
        console.log(error.message);
    }
}

const loadAddNewCategory = async (req, res) => {

    try {
        res.render('new-categories')
    } catch (error) {
        console.log(error.message);
    }
}

const addNewCategory = async (req, res) => {

    try {
        const name = req.body.categoryname
        const existCategory = await Category.findOne({ categoryName: { $regex: '.*' + name + '.*', $options: 'i' } })
        if (existCategory) {
            res.render('new-categories', { message: "Category already exist" })
        } else {
            let img
            if (req.file) {
                img = req.file.filename
            }
            const category = new Category({
                categoryName: req.body.categoryname,
                image: img
            })
            const categoryData = await category.save()
            if (categoryData) {
                res.redirect('/admin/category_manage')
            } else {
                res.render('categories', { message: "something wrong" })
            }
        }
    } catch (error) {
        console.log(error.message);
    }
}

const loadEditCategory = async (req, res) => {

    try {
        const id = req.query.id
        const categoryData = await Category.findById({ _id: id })
        res.render('edit-category', { categoryData })
    } catch (error) {
        console.log(error.message);
    }
}

const updateCategory = async (req, res) => {

    try {
        if (req.file) {
            var image = req.file.filename
        }
        const categoryUpdatedData = await Category.findByIdAndUpdate({ _id: req.body.category_id }, { $set: { categoryName: req.body.categoryname, image: image } })
        if (categoryUpdatedData) {
            res.redirect('/admin/category_manage')
        } else {
            res.render(404)
        }
    } catch (error) {
        console.log(error.message);
    }
}

const deleteCategory = async (req, res) => {

    try {
        const id = req.query.id
        await Category.deleteOne({ _id: id })
        res.redirect('/admin/category_manage')
    } catch (error) {
        console.log(error.message);
    }
}

const orderListing = async (req, res) => {

    try {
        const orders = await Order.find().populate('userID')
        res.render('order-list', { orders })
    } catch (error) {
        console.log(error.message);
    }
}

const loadOrderDeatails = async (req, res) => {

    try {
        const orderData = await Order.findOne({ _id: req.query.id }).populate('userID')
        res.render('single-order', { orderData })
    } catch (error) {
        console.log(error.message);
    }
}

const updateOrderDeatails = async (req, res) => {

    try {
        const orderData = await Order.findByIdAndUpdate({ _id: req.query.id },
            {
                $set: {
                    paymentStatus: req.body.paymentStatus,
                    orderStatus: req.body.orderStatus,
                }
            })
        res.redirect('/admin/orders')
    } catch (error) {
        console.log(error.message);
    }
}

const couponManage = async (req, res) => {

    try {
        const coupons = await Coupon.find()
        res.render('coupons', { coupons })
    } catch (error) {
        console.log(error.message);
    }
}

const loadAddNewCoupon = async (req, res) => {

    try {
        res.render('add-coupon')
    } catch (error) {
        console.log(error.message);
    }
}

const NewCoupon = async (req, res) => {

    try {
        const code = req.body.code
        const existCoupon = await Coupon.findOne({ couponCode: { $regex: '.*' + code + '.*', $options: 'i' } })
        
        if (existCoupon) {
            res.render('add-coupon', { message: "coupon already exist" })
        } else {
            const coupon = new Coupon({
                couponCode: req.body.code,
                discount: req.body.discount,
                minAmount: req.body.minAmount,
                maxDiscount: req.body.maxDiscount,
                count: req.body.count,
                expire: new Date()
            })
           
            const couponData = await coupon.save()
            if (couponData) {
                res.redirect('/admin/coupons')
            } else {
                res.render('categories', { message: "something wrong" })
            }
        }
    } catch (error) {
        console.log(error.message);
    }
}

const deleteCoupons = async (req, res) => {

    try {
        await Coupon.deleteOne({ _id: req.query.id })
        res.redirect('/admin/coupons')
    } catch (error) {
        console.log(error.message);
    }
}

const logout = async (req, res) => {

    try {
        delete req.session.admin_id
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
    loadUserDeatails,
    blockUser,

    loadProducts,
    loadProductDeatails,
    loadAddNewProduct,
    insertNewProduct,
    loadEditProduct,
    updateProduct,
    deleteProduct,

    categoryManage,
    loadAddNewCategory,
    addNewCategory,
    loadEditCategory,
    updateCategory,
    deleteCategory,
    orderListing,
    loadOrderDeatails,
    updateOrderDeatails,
    couponManage,
    loadAddNewCoupon,
    NewCoupon,
    deleteCoupons,
    logout,
}