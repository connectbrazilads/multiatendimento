const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const { getEquipments, addEquipment, updateEquipment, deleteEquipment, getOSList, createOS, updateOS, generatePdf, draftOS, getOSTypes, getOSTechnicians } = require('../controllers/osController');

router.use(authenticate);

// OS Metadata
router.get('/types', getOSTypes);
router.get('/technicians', getOSTechnicians);

// Equipments (can be managed here or under contacts)
router.get('/contacts/:contactId/equipments', getEquipments);
router.post('/contacts/:contactId/equipments', addEquipment);
router.patch('/equipments/:id', updateEquipment);
router.delete('/equipments/:id', deleteEquipment);

// OS CRUD
router.get('/', getOSList);
router.post('/', createOS);
router.post('/draft', draftOS);
router.patch('/:id', updateOS);
router.get('/:id/pdf', generatePdf);

module.exports = router;
