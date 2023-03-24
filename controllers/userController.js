const User = require('../models/userModel')
const bcrypt = require('bcrypt')
const config = require("../config/config")
const randormString = require("randomstring")
const nodemailer = require("nodemailer")
const env = require('dotenv').config();

//passwrodHashing
const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {
        console.log(error.message);
    }
}

//signup verification Mail Sending using smtp
const sendVerifyMail = async (name, email, user_id) => {

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
            from: 'Shopify',
            to: email,
            subject: 'Veification Mail From Shopify',
            html: '<p> Hii  ' + name + ' , please click here to  <a href="http://localhost:3000/verify?id=' + user_id + ' " >verify  </a> your mail.</p>'
        }
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log("Email has been sent:- ", info.response);
            }
        })

    } catch (error) {
        console.log(error.message);
    }
}






//load Verified Page
const verifyMail = async (req, res) => {

    try {
        const updateInfo = await User.updateOne({ _id: req.query.id }, { $set: { is_verified: 1 } })
        console.log(updateInfo);
        res.render('email-verified')
    } catch (error) {
        console.log(error.message)
    }
}

//load sign page
const loadSignup = async (req, res) => {

    try {
        res.render("signup")
    } catch (error) {
        console.log(error.message);
    }
}

//adding user to database
const insertUser = async (req, res) => {

    try {
        const spassword = await securePassword(req.body.password);
        const checkExist = await User.findOne({ email: req.body.email })
        if (checkExist) {
            res.render('signup', { exist: "Email Already Registered, Please Login" })
        } else {
            const user = new User({
                name: req.body.name,
                email: req.body.email,
                mobile: req.body.phone,
                password: spassword
            })
            const userData = await user.save()
            if (userData) {
                sendVerifyMail(req.body.name, req.body.email, userData._id)
                res.render('signup', { message: "Registred Succefully, Please Verify Your Mail" })
            } else {
                res.render('signup', { message: "your registration has been failed" })
            }
        }
    } catch (error) {
        console.log(error.message);
    }
}

// for Load Login page
const loadLogin = async (req, res) => {
    try {
        res.render("login")
    } catch (error) {
        console.log(error.message);
    }
}

//verify customer Login
const verifyLogin = async (req, res) => {

    try {
        const email = req.body.email
        const password = req.body.password
        const userData = await User.findOne({ email: email })

        if (userData) {
            const passwordMatch = await bcrypt.compare(password, userData.password)
            if (passwordMatch) {
                if (userData.is_verified === 1) {
                    if(userData.is_blocked === 0){
                        req.session.user_id = userData._id
                        res.redirect('/home')
                    }else{
                        res.render('login', { message: "You were Blocked" })
                    }
                   
                } else {
                    res.render('login', { message: "Please Verify Your Mail" })
                }
            } else {
                res.render('login', { message: "Email or Password is incorrect" })
            }
        } else {
            res.render('login', { message: "Email or Password is incorrect" })
        }
    } catch (error) {
        console.log(error.message)
    }
}

//load forgot password 
const forgetLoad = async (req, res) => {

    try {
        res.render('forgot')
    } catch (error) {
        console.log(error.message)
    }
}

//  send mail for reset password
const sendResetPasswordMail = async (name, email, token) => {

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
            from: config.email,
            to: email,
            subject: 'Reset Your Password Shopify',
            html: '<p> Hii  ' + name + ' , please click here to  <a href="http://localhost:3000/reset_password?token=' + token + ' " >Reset  </a> your Password.</p>'
        }
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log("Email has been sent:- ", info.response);
            }
        })

    } catch (error) {
        console.log(error.message);
    }
}

//for forget password verify
const forgetVerify = async (req, res) => {

    try {
        const email = req.body.email
        const userData = await User.findOne({ email: email })
        if (userData) {
            if (userData.is_verified === 0) {
                res.render('forgot', { message: "Please Verify your Mail" })
            } else {
                const randomString = randormString.generate()
                const updatedData = await User.updateOne({ email: email }, { $set: { token: randomString } })
                sendResetPasswordMail(userData.name, userData.email, randomString)
                res.render('forgot', { successmessage: "Please Check your mail" })
            }
        } else {
            res.render('forgot', { message: "Email is incorrect" })
        }
    } catch (error) {
        console.log(error.message)
    }
}

// for load reset password page
const resetPasswordLoad = async (req, res) => {

    try {
        const token = req.query.token
        const tokenData = await User.findOne({ token: token })
        if (tokenData) {
            res.render('reset-password', { user_id: tokenData._id })
        } else {
            res.sendStatus(400)
        }
    } catch (error) {
        console.log(error.message)
    }
}

const resetPassword = async (req, res) => {

    try {
        const password = req.body.password
        const user_id = req.body.user_id
        const secure_pass = await securePassword(password)
        const updatedData = await User.findByIdAndUpdate({ _id: user_id }, { $set: { password: secure_pass, token: '' } })
        res.redirect("/login")
    } catch (error) {
        console.log(error.message)
    }
}

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const client = require('twilio')(accountSid, authToken);

const loadLoginWithOtp = async (req, res) => {
    try {
        res.render('otp-login')
    } catch (error) {
        console.log(error.message);
    }
}

const otpGeneration = async (req, res, next) => {

    try {
        const mobile_No = req.body.phone
        const userData = await User.findOne({ mobile: mobile_No })

        if (userData) {
            client.verify.v2.services('VA5cbb1853d0d0df5ffde3e55a126dd812')
                .verifications

                .create({ to: '+91' + mobile_No, channel: "sms" })
                .then((verification) => console.log(verification.status))
            req.session.mobile = req.body.phone
            res.redirect('/otp_verify')
        } else {
            res.render('otp-login', { message: "Your Number is not Registered" })
        }
    } catch (error) {
        console.log(error.message);
    }
}

const loadEnterOtp = async (req, res) => {
    try {
        res.render('enter-otp')
    } catch (error) {
        console.log(error.message);
    }
}

const otpVerification = async (req, res) => {
    try {

        let otp = req.body.otp

        client.verify.v2.services('VA5cbb1853d0d0df5ffde3e55a126dd812')
            .verificationChecks

            .create({ to: '+91' + req.session.mobile, code: otp })
            .then((verification) => {

                if (verification.status === "approved") {
                    console.log(verification.status)

                    res.redirect('/home')
                } else {
                    res.render('enter-otp', { message: " Incorrect otp" })
                }
            })

    } catch (error) {
        console.log(error.message);
    }
}


// for load home page
const loadHome = async (req, res) => {

    try {
     res.render('home')
    } catch (error) {
        console.log(error.message)
    }
}


//user logout
const userLogout = async (req, res) => {

    try {
        req.session.destroy()
        res.redirect('/login')
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {

    loadSignup,
    insertUser,
    verifyMail,
    loadLogin,
    verifyLogin,
    forgetLoad,
    forgetVerify,
    resetPasswordLoad,
    resetPassword,
    loadHome,
    userLogout,
    loadLoginWithOtp,
    otpGeneration,
    loadEnterOtp,
    otpVerification,
    
}