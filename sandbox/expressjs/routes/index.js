var express = require('express');
/**
 * С помощью класса express.Router можно создавать модульные, монтируемые обработчики маршрутов.
 * Экземпляр Router представляет собой комплексную систему промежуточных обработчиков и маршрутизации;
 * по этой причине его часто называют “мини-приложением”.
 */
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
