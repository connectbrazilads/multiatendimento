const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const requirePermission = require('../middlewares/requirePermission');
const { getEquipments, addEquipment, updateEquipment, deleteEquipment, getOSList, createOS, getOSStatus, updateOS, generatePdf, draftOS, getOSTypes, getOSTechnicians } = require('../controllers/osController');
const { sendManagerCopy } = require('../controllers/serviceOrderManagerController');

router.use(authenticate, requirePermission('crm.view'));

// OS Metadata
router.get('/types', getOSTypes);
router.get('/technicians', getOSTechnicians);

// Equipments (can be managed here or under contacts)
router.get('/contacts/:contactId/equipments', getEquipments);
router.post('/contacts/:contactId/equipments', requirePermission('inbox.create_os'), addEquipment);
router.patch('/equipments/:id', requirePermission('inbox.create_os'), updateEquipment);
router.delete('/equipments/:id', requirePermission('inbox.create_os'), deleteEquipment);

// OS CRUD
router.get('/', getOSList);
router.post('/', requirePermission('inbox.create_os'), createOS);
router.post('/draft', requirePermission('inbox.create_os'), draftOS);
router.get('/:id/status', getOSStatus);
router.post('/:id/send-manager-copy', requirePermission('inbox.create_os'), sendManagerCopy);
router.patch('/:id', requirePermission('inbox.create_os'), updateOS);
router.get('/:id/pdf', generatePdf);

module.exports = router;
