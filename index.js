 const dbConnect= require('./config/dbConnect')
dbConnect()
const express = require("express")
const app = express()
const path = require('path')
const userRoute = require("./routes/userRoute")
const adminRoute = require("./routes/adminRoute")
const config = require("./config/config")
const session = require("express-session")
app.set('view engine', 'ejs')

const nocache = require("nocache");


app.use(nocache());
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(session(
    {
        secret: config.sessionSecret,
        resave: false,
        saveUninitialized: true,
    }))

app.use(express.static(path.join(__dirname, 'public')))

app.use('/admin',adminRoute)

app.use('/',userRoute)

app.listen(process.env.PORT, ()=>{
console.log("server is running");
})