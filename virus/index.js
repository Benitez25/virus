const express = require ('express')
const body_parser= require('body-parser')
const peticiones = require('./src/routes/peticiones')

require('dotenv').config()
const app = express()

app.set('port', process.env.PORT || '5050')

app.use(body_parser.json())
app.use(body_parser.urlencoded({extended:false}))

app.get('/', (req, res, next) => { res.send({resultado:'DERECHOS DE AUTOR, PENADO POR LA LEY.'}) })
app.use('/webapi', peticiones)

app.listen(app.get('port'), ()=>{
    console.log(`Conectado al puerto ${app.get('port')}`)
})