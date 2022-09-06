const express = require('express')
const router = express.Router()
const cPeticiones = require('../controllers/c_Peticiones')

router.get('/cerrarSesion/:id', cPeticiones.cerrarSesion)

router.get('/planesBD/:tipo', cPeticiones.planesBD)
router.post('/userLoginBD/:token', cPeticiones.userLoginBD)
router.post('/userCreateBD/:token', cPeticiones.userCreateBD)
router.get('/userRestartPassword/:telefono', cPeticiones.userRestartPassword)
router.put('/userCompraMenbresia', cPeticiones.userCompraMenbresia)
router.get('/userAgregarSolicitud/:id/:placa/:id_TM', cPeticiones.userAgregarSolicitud)
router.get('/userAgregarSolicitudReniec/:id/:dni/:id_TM', cPeticiones.userAgregarSolicitudReniec)
router.get('/userHistorialSolicitudesVehicular/:id', cPeticiones.userHistorialSolicitudesVehicular)
router.get('/userHistorialSolicitudesReniec/:id', cPeticiones.userHistorialSolicitudesReniec)
router.get('/userNotificationBD/:id', cPeticiones.userNotificationBD)

router.get('/consultarDNI/:dni', cPeticiones.consultarDNI)
router.post('/consultarDNI_Placa', cPeticiones.consultarDNI_Placa)
router.get('/consultaBreveteCarro/:dni', cPeticiones.consultaBreveteCarro)
router.get('/frmConsultaPlacaITV/:placa', cPeticiones.frmConsultaPlacaITV)
router.get('/apeseg/:placa', cPeticiones.apeseg)
router.get('/sat_callao/:placa', cPeticiones.sat_callao)
router.get('/sat_lima/:placa', cPeticiones.sat_lima)
router.get('/lidercon/:placa', cPeticiones.lidercon)
router.get('/registroMercancias/:placa', cPeticiones.registroMercancias)
router.get('/sunarp/:placa', cPeticiones.sunarp)

module.exports = router
