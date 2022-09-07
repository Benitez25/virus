const jwt = require('jsonwebtoken');
const puppeteer = require('puppeteer-extra')
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')
const { run } = require('../helper/valid');
const poolQuery = require('../../database')
const axios = require('axios').default;
const JSSoup = require('jssoup').default;
const axiosInstance = axios.create({ withCredentials: true })
const moment = require('moment')

var {PassThrough} = require("stream");

puppeteer.use(
    RecaptchaPlugin({
      provider: {
        id: '2captcha',
        token: '' // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
      },
      visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
    })
)

//CERRAR SESION QUITAR
const controllerPeticiones = {
    cerrarSesion: async function(req, res){
        const {id} = req.params
        try {
            await poolQuery.query(`UPDATE T_Usuarios set estado_envio_token = '02' where id = ? `, [id])
            return res.send({res: true})
        } catch (error) {
            return res.send({error: 'Error conexión.'})
        }
    }, 
    userAgregarSolicitud: async function(req, res){
        const {id, placa, id_TM} = req.params
        try {
            await poolQuery.query(`insert into T_Solicitudes_Vehicular (id_usuario, placa, fecha_solicitud) values (?,?,now())`, [id, placa])
            const cantidadSolicitud = await poolQuery.query(`select * from T_Usu_Mem where id_usuario = ? and id = ?`, [id, id_TM])
            const solicitud = cantidadSolicitud[0]
            let cantMa = parseInt(solicitud.cantRealizadas)+1
            await poolQuery.query(`UPDATE T_Usu_Mem set cantRealizadas = ? where id_usuario = ? and id = ?`, [cantMa, id, id_TM])
            return res.send({res: true})
        } catch (error) {
            return res.send({error: 'Error conexión.'})
        }
    }, 
    userAgregarSolicitudReniec: async function(req, res){
        const {id, dni, id_TM} = req.params
        try {
            await poolQuery.query(`insert into T_Solicitudes_Reniec(id_usuario, dni, fecha_solicitud) values (?,?,now())`, [id, dni])
            const cantidadSolicitud = await poolQuery.query(`select * from T_Usu_Mem where id_usuario = ? and id = ?`, [id, id_TM])
            const solicitud = cantidadSolicitud[0]
            let cantMa = parseInt(solicitud.cantRealizadas)+1
            await poolQuery.query(`UPDATE T_Usu_Mem set cantRealizadas = ? where id_usuario = ? and id = ?`, [cantMa, id, id_TM])
            return res.send({res: true})
        } catch (error) {
            return res.send({error: 'Error conexión.'})
        }
    }, 
    userHistorialSolicitudesVehicular: async function(req, res){
        const {id} = req.params
        try {
            const resSolicitud = await poolQuery.query(`select * from T_Solicitudes_Vehicular where id_usuario = ? order by fecha_solicitud desc limit 50`, [id])
            return res.send(resSolicitud)
        } catch (error) {
            return res.send({error: 'Error conexión.'})
        }
    }, 
    userHistorialSolicitudesReniec: async function(req, res){
        const {id} = req.params
        try {
            const resSolicitud = await poolQuery.query(`select * from T_Solicitudes_Reniec where id_usuario = ? order by fecha_solicitud desc limit 50`, [id])
            return res.send(resSolicitud)
        } catch (error) {
            return res.send({error: 'Error conexión.'})
        }
    }, 
    userCompraMenbresia: async function(req, res){
        const {id, id_usuario, id_membresia, cantSolicitudes, diasContratador} = req.body
        try {
            const fechaTermino = moment().add(diasContratador, 'days').format('YYYY-MM-DD')
            await poolQuery.query(`UPDATE T_Usu_Mem set id_membresia = ?, fechaAplicacion = now(), fechaTermino = ?, cantSolicitudes = ? where id_usuario = ? and id = ?`, [id_membresia, fechaTermino, cantSolicitudes, id_usuario, id])
            const planActual = await poolQuery.query(`SELECT tum.*, tm.descripcion  FROM T_Usu_Mem tum inner join T_Membresia tm on tm.id = tum.id_membresia  WHERE tum.id  = ?`, [id])
            let plan = planActual[0]
            return res.status(200).send({res: {msg: 'Compra realizada correctamente.', plan}})
        } catch (error) {
            return res.status(200).send({error: 'Error conexión.'})
        }
    }, 
    userRestartPassword: async function(req, res){
        const {telefono} = req.params
        try {
            const resUser = await poolQuery.query(`select id from T_Usuarios where telefono = ? and estado = '01'`, [telefono])
            if(resUser.length < 1) return res.send({res: 'Usuario no existe.'})
            const user = resUser[0]
            const codigo = Math.round(Math.random()*999999);
            return res.status(200).send({codigo})
        } catch (error) {
            return res.status(200).send({error: 'Error conexión.'})
        }
    }, 
    userLoginBD: async function(req, res){
        const {telefono, password} = req.body
        const {token} = req.params
        try {
            const resUser = await poolQuery.query(`select id, telefono, correo, password from T_Usuarios where telefono = ? and estado = '01'`, [telefono])
            if(resUser.length < 1) return res.send({error: 'Usuario no existe.'})
            const user = resUser[0]
            if(user.password !== password) return res.send({error: 'Credenciales incorrectas.'})
            await poolQuery.query(`update T_Usuarios set token = ?, estado_envio_token = '01' where telefono = ?`, [token, telefono])
            const planActivo = await poolQuery.query(`select t_u_m.*, t_m.descripcion descripcion_plan, t_t_m.descripcion
                from T_Usu_Mem t_u_m 
                inner join T_Usuarios t_u on t_u_m.id_usuario = t_u.id 
                inner join T_Membresia t_m on t_u_m.id_membresia = t_m.id
                inner join T_Tipo_Menbresia t_t_m on t_m.id_tipo_menbresia = t_t_m.id
                where t_u.telefono = ? and t_m.estado = '01' and t_u.estado = '01'
                order by t_t_m.descripcion ASC;`, [telefono])
            let planVehicular = null
            let planReniec = null
            if(planActivo.length < 1){
                plan = {
                    fechaAplicacion :  0,
                    fechaTermino :  0,
                    cantSolicitudes :  0,
                    cantRealizadas :  0,
                    descripcion: '-'
                }
            }else{
                planVehicular =  planActivo[1]
                planReniec =  planActivo[0]
            }
            jwt.sign({user}, 'secretkey', {expiresIn: '365d'},(err, token) => {
                return res.status(200).send({token, user, planVehicular, planReniec})
            })
        } catch (error) {
            return res.send({error: 'Error de servidor.'})
        }
    }, 
    userCreateBD: async function(req, res){
        const {correo, telefono, password} = req.body
        const {token:token_expo} = req.params
        try {
            const resUser = await poolQuery.query(`select * from T_Usuarios where telefono = ?`, [telefono])
            if(resUser.length > 0) return res.send({error: 'Usuario ya se encuentra registrado.'})
            await poolQuery.query(`INSERT INTO T_Usuarios (correo, telefono, password, estado, token, estado_envio_token) values (?,?,?, '01', ?, '01')`, [correo, telefono, password, token_expo])
            const login = await poolQuery.query(`select id, telefono, correo  from T_Usuarios where telefono = ? and estado = '01'`, [telefono])
            const user = login[0]
            const fechaTermino = moment().add(90, 'days').format('YYYY-MM-DD')
            await poolQuery.query(`INSERT INTO T_Usu_Mem(id_usuario, id_membresia, fechaAplicacion,	fechaTermino, cantSolicitudes) values(?,?,now(),?,?)`, [user.id, 5, fechaTermino, 50])
            await poolQuery.query(`INSERT INTO T_Usu_Mem(id_usuario, id_membresia, fechaAplicacion,	fechaTermino, cantSolicitudes) values(?,?,now(),?,?)`, [user.id, 10, fechaTermino, 50])
            const planActivo = await poolQuery.query(`select t_u_m.*, t_m.descripcion descripcion_plan, t_t_m.descripcion
            from T_Usu_Mem t_u_m 
            inner join T_Usuarios t_u on t_u_m.id_usuario = t_u.id 
            inner join T_Membresia t_m on t_u_m.id_membresia = t_m.id
            inner join T_Tipo_Menbresia t_t_m on t_m.id_tipo_menbresia = t_t_m.id
            where t_u.telefono = ? and t_m.estado = '01' and t_u.estado = '01'
            order by t_t_m.descripcion ASC;`, [telefono])
            console.log(planActivo)
            let planVehicular =  planActivo[1]
            let planReniec =  planActivo[0]
            jwt.sign({user}, 'secretkey', {expiresIn: '365d'},(err, token) => {
                return res.status(200).send({token, user, planVehicular, planReniec})
            })
        } catch (error) {
            return res.send({error: 'Error de conexión.'})
        }
    },
    planesBD: async function(req, res){
        const {tipo} = req.params
        try{
            const resMenbresias = await poolQuery.query(`select * from T_Membresia where estado = '01' and id not in (5, 10) and id_tipo_menbresia = ?`, [tipo])
            return res.send(resMenbresias) 
        }catch(e){
            return res.send({
                id: 1,
                descripcion: 'Error de conexión.',
                precio: 0,
                estado: '00',
                periodo_mes: 0
              })
        }
    },
    userNotificationBD: async function(req, res){
        const {id} = req.params
        try{
            const resListaNotificacion = await poolQuery.query(`select * from T_Notificacion where id_usuario = ?`,[id])
            return res.send(resListaNotificacion) 
        }catch(e){
            return res.send({ error: 'Sin conexión.' })
        }
    },



    consultarDNI: async function(req, res){
        const {dni} = req.params
        try{
            const resDNI = await axiosInstance.get(`https://apiperu.net.pe/api/dni/plus/${dni}`, 
            {
                    headers:{
                        'Authorization': 'Bearer PUdDnC9j4bYdfEu5RGT7V0g3upwxayhnNMzoTN8DLqSE4XqKSA'
                    }
                })
            const {data} = resDNI
            data.dni = dni
            res.send(data)
        }catch(e){
            res.send({res:e})
        }
    },
    consultarDNI_Placa: async function(req, res){
        const {NroDocumento} = req.body
        try{
            const resConsultarDNI_Placa = await axiosInstance.post(`https://licencias.mtc.gob.pe/api/puntos/consultaConsolidado`,
                {
                    "TipoBusqueda":0,
                    "TipoDocumento":2,
                    "NumDocumento":NroDocumento,
                    "NumLicencia":"",
                    "ApePaterno":"",
                    "ApeMaterno":"",
                    "Nombre":""
                }
            )
            const {data} = resConsultarDNI_Placa
            const {IsSuccess, Data, Message} = data
            if(!IsSuccess) return res.send({ res: {dni: NroDocumento, msg: Message}})
            const {Administrado} = Data
            res.send({ res: {
                    dni: Administrado.var_numdocumento,
                    num_licencia: Administrado.num_licencia,
                    estado: Administrado.estado,
                    clase_categoria: Administrado.clase_categoria,
                    fecharevalidacion: Administrado.fecharevalidacion,
                    ptsacumulados: Administrado.PtsAcumulados.toString(),
                    mensajelimite: Administrado.MensajeLimite.length > 0 ? Administrado.MensajeLimite : 'Sin mensaje.',
                    msg: null
                }
             })
        }catch(e){
            res.send({res:{
                dni: NroDocumento,
                ptsacumulados: null,
                msg: "Error con la busqueda de información."
            }})
        }
    },
    consultarLicenciaMoto: async function(req, res){
        const {dni} = req.params
        try{
            const browser = await puppeteer.launch();
            const page = await browser.newPage()
            await page.goto("https://licencias-tramite.mtc.gob.pe/frmLB_Consulta.aspx")
            let resultado = await Promise.all([
                page.type("#ContentPlaceHolder2_txtC01_NumDocumento", dni),
                page.evaluate(() => { return document.querySelector('#ContentPlaceHolder2_imgCaptcha').src })
            ])
            const img64 = await run(resultado[1])
            await page.type("#ContentPlaceHolder2_txtCaptcha", img64)
            await page.waitForTimeout(1000)
            await page.waitForSelector('#ContentPlaceHolder2_lbtnC01_Consultar')
            await page.click('#ContentPlaceHolder2_lbtnC01_Consultar')
            await page.waitForTimeout(1000)
            let respuesta = await page.evaluate(() => {
                return document.querySelector('#ContentPlaceHolder2_lblC01_Pos_C').innerText
            })
            return res.send({res:respuesta})     
            
        }catch(e){
            return res.send({res:'Tiempo de conexión agotado.'})
        }
    },
    consultaBreveteCarro: async function(req, res){
        const {dni} = req.params
        
        url = 'https://recordconductor.mtc.gob.pe/Captcha/CaptchaImage?0.29668758946329654'
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers:{ 'Cookie': 'ASP.NET_SessionId=0vpp23jl5eyftyiblt3owldg' } 
        });
        const chunks = response.data
        .pipe(new PassThrough({encoding:'base64'}));
        let str = '';
        for await (let chunk of chunks) {
            str += chunk;
        }
        const resCodigo = await run('data:image/jpeg;base64,'+str)
         const resBrevete = await axiosInstance.get('https://recordconductor.mtc.gob.pe/RecCon/ObtenerDatosAdministrado?str_tpbusqueda=1&str_tipo_documento=2&str_num_documento='+dni+'&str_captcha='+resCodigo,
             {
                 headers:{
                     'Cookie': 'ASP.NET_SessionId=0vpp23jl5eyftyiblt3owldg',
                    
                 }
             }
         )
        res.send({res:resBrevete.data.dato})
        
    },
    frmConsultaPlacaITV: async function(req, res){
        const {placa} = req.params
        /*jwt.verify(req.token, 'secretkey', async (err, authData) => {
            if(err){
                res.status(403).send({res: 'Acceso denegado, iniciar sesión nuevamente.'})
            }else{*/
            try{
                const resPlata = await axiosInstance.get('https://portal.mtc.gob.pe/reportedgtt/form/frmConsultaPlacaITV.aspx',
                    { headers:{ 'Cookie': 'ASP.NET_SessionId=0vpp23jl5eyftyiblt3owldg' } })
                const {data} = resPlata
                let soup = new JSSoup(data)
                let tag = soup.find('img');
                const a = await run(tag.attrs.src)
                const resPlataInfo = await axiosInstance.post('https://portal.mtc.gob.pe/reportedgtt/form/frmConsultaPlacaITV.aspx/getPlaca',
                    {
                        ose1:"1", ose2:placa, ose3:a.toString()
                    },
                    {
                        headers:{
                            'Cookie': 'ASP.NET_SessionId=0vpp23jl5eyftyiblt3owldg',
                            
                        }
                    }
                
                )
                res.send(resPlataInfo.data.d)
            }catch(e){
                res.send({err: 'sin respuesta frmConsultaPlacaITV'})
            }
            /*}
        })*/
    },
    apeseg : async function (req, res){
        const {placa} = req.params
        try {
            const response = await axiosInstance.post('https://ccsonline.consejeros.com.pe/busciasapi//Extra-Intermediario/GetCertVehApeseg?placa='+placa,
                /*{
                    headers:{
                        'Ocp-Apim-Subscription-Key': 'd18241e907c144a2a8ecc9710c186c97'
                    }
                }*/
            )
            const {data} = response
            res.send({data})
        } catch (error) {
            res.send({err: 'sin respuesta apeseg'})
        }
    },
    sat_callao: async function(req, res){
        const {placa} = req.params
        try{
            const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
            const page = await browser.newPage()
            await page.goto("https://pagopapeletascallao.pe/consulta-pagos/")
            await page.type("#FiltrarNumeroPapeleta", placa)
            
            await page.evaluate(() => {
                document.querySelectorAll("button[type='submit']")[0].click();
            });
            
            await page.waitForTimeout(5000)

            let recopilarPrecios = await page.evaluate(() => {
                let datitos = []
                let valores =  document.querySelectorAll('.odd > .text-right')
                for (const valore1s of valores) {
                    datitos.push(valore1s.innerText)
                }
                return datitos
            })
            let cantidadTotal = 0.00
            recopilarPrecios.forEach(value => {
                cantidadTotal = cantidadTotal + parseFloat(value)
            })
            res.send({
                placa,
                cantidad:recopilarPrecios.length,
                cantidadTotal
            })    
        }catch(e){
            res.send({res:e})
        }
    },
    sat_lima: async function(req, res){
        const {placa} = req.params
        try{
            const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
            const page = await browser.newPage()
            await page.goto("https://www.sat.gob.pe/WebSitev8/IncioOV2.aspx")
            const f = await page.$("frame[id='fraRightFrame']")
            const x = await f.contentFrame();
            const n = await x.$("body")
            let {href} =  await n.evaluate(() => {
                return {
                    href: document.getElementById("menuOption07").href
                }
            })
            await page.goto(href)
            //await page.goto("https://www.sat.gob.pe/VirtualSAT/modulos/papeletas.aspx?mysession=tmUDO9Jn7miXFaaGQJSx67Vr62EthENhx7m5Y8NQzEs%3d")
            //await Promise.all([page.type("#tipoBusquedaPapeletas", "busqPlaca"), page.type("#ctl00_cplPrincipal_txtPlaca", placa)])
            await page.type("#tipoBusquedaPapeletas", "busqPlaca")
            await page.type("#ctl00_cplPrincipal_txtPlaca", placa)
            await page.waitForSelector('iframe[src*="recaptcha/"]')
            await page.solveRecaptchas()
            await page.click('#ctl00_cplPrincipal_CaptchaContinue')
            await page.waitForTimeout(5000)
            let recopilarPrecios = await page.evaluate(() => {
                let datitos = []
                let grillaRows =  document.querySelectorAll('.grillaRows')
                for (const valore1s of grillaRows) {
                    datitos.push(valore1s.cells[13].innerText)
                }
                let grillaAlternate =  document.querySelectorAll('.grillaAlternate')
                for (const valore1s of grillaAlternate) {
                    datitos.push(valore1s.cells[13].innerText)
                }
                return datitos
                
            })
            let cantidadTotal = 0.00
            recopilarPrecios.forEach(value => {
                cantidadTotal = cantidadTotal + parseFloat(value)
            })
            res.send({
                placa,
                cantidad:recopilarPrecios.length,
                cantidadTotal
            })
            
            
        }catch(e){
            res.send({res:e})
        }
    },
    lidercon:async function(req, res){
        const {placa} = req.params
        try {
            const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
            const page = await browser.newPage()
            await page.goto("http://195.135.51.156:8080/ConsultaCITV/")
            await page.type("#pageinicio\\:form1\\:matricula_input", placa)
            await page.click("#pageinicio\\:form1\\:j_idt12")
            await page.waitForTimeout(5000)
            let recopilarInformacion = await page.evaluate(() => {
                let datitos = []
                let grillaRows =  document.querySelectorAll('.ui-table-row')
                for (const valore1s of grillaRows) {
                    datitos.push(valore1s.innerText)
                }
                return datitos
            })
            if(recopilarInformacion.length < 1){
                return res.send({placa, mensajeVacio:'Sin resultados.'})
            }
            let crearResultado = {}
            for (let index = 0; index < recopilarInformacion.length; index++) {
                switch (index) {
                    case 0:
                        let splitFila1 = recopilarInformacion[index].split('\t')
                            crearResultado.fechaI = splitFila1[0]
                            crearResultado.fechaFin = splitFila1[1]
                        break;
                    case 1:
                        let splitFila2 = recopilarInformacion[index].split('\t')
                            crearResultado.placa = splitFila2[0]
                            crearResultado.certificado = splitFila2[1]
                        break;
                    case 2:
                        let splitFila3 = recopilarInformacion[index].split('\t')
                            crearResultado.resultado = splitFila3[0]
                        break;
                    case 3:
                        let splitFila4 = recopilarInformacion[index].split('\t')
                            crearResultado.CITV = splitFila4[0]
                        break;
                    case 4:
                        let splitFila5 = recopilarInformacion[index].split('\t')
                            crearResultado.servicio = splitFila5[1]
                        break;
                    default:
                        break;
                }
            }
            res.send(crearResultado)
        } catch (e) {
            res.send({res:e})
        }
    },
    registroMercancias:async function(req, res){
        const {placa} = req.params
        try {
            const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
            const page = await browser.newPage()
            await page.goto("https://www.mtc.gob.pe/tramitesenlinea/tweb_tLinea/tw_consultadgtt/Frm_rep_intra_mercancia.aspx")
            await page.click('#rbOpciones_2')
            await page.type("#txtValor", placa)
            await page.click('#btnBuscar')
            await page.waitForTimeout(3000)
            let resultado = await page.evaluate(() => {
                let estadoTabla = document.querySelectorAll('#lblMensaje').length
                return estadoTabla
            })
            if(resultado === 1) return res.send({error:'No se encontraron resultados.'})
            await page.evaluate(() => {
                let siguientePagina = document.querySelectorAll('a')[2]
                siguientePagina.click()
            })
            await page.waitForTimeout(3000)
            let resultadoEnvio = await page.evaluate(() => {
                let codigo = document.getElementById('lblCodigo').innerText
                let razonSocial = document.getElementById('lblRazonSocial').innerText
                let direccion = document.getElementById('lblDireccion').innerText
                let telefono = document.getElementById('lblTelefono').innerText
                let ciudad = document.getElementById('lblCiudad').innerText
                let personaJuridica = document.getElementById('lblTipPersoneria').innerText
                let modalidad = document.getElementById('lblModalidad').innerText
                let estado = document.getElementById('lblEstado').innerText
                let vigencia = document.getElementById('lblVigencia').innerText
                return {
                    codigo,
                    razonSocial,
                    direccion,
                    telefono,
                    ciudad,
                    personaJuridica,
                    modalidad,
                    estado,
                    vigencia,
                    error: ''
                }
            })
            res.send(resultadoEnvio)
        } catch (e) {
            res.send({error:'Error de conexión.'})
        }
    },
    sunarp:async function(req, res){
        const {placa} = req.params
        try {
            const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
            const page = await browser.newPage()
            await page.setExtraHTTPHeaders({ 'Referer': 'https://www.sunarp.gob.pe/seccion/servicios/detalles/0/c3.html' })
            await page.goto("https://www.sunarp.gob.pe/ConsultaVehicular/")
            await page.type("#MainContent_txtNoPlaca", placa)
            await page.waitForSelector('iframe[src*="recaptcha/"]')
            await page.solveRecaptchas()
            await page.click('#MainContent_btnSearch')
            await page.waitForTimeout(5000)
            let extraerImagen = await page.evaluate(() => {
                let datitos = []
                let img =  document.querySelectorAll('#MainContent_imgPlateCar')
                for (const value of img) {
                    datitos.push(value.src)
                }
                return datitos
                
            })
            //await page.screenshot({path: 'asd.png'});
            res.send({res:extraerImagen})
        } catch (e) {
            res.send({error:'Error de conexión.'})
        }
    }
}

module.exports = controllerPeticiones