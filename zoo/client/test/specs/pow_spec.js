
//we specify test path regarding baseUrl specified in test_runner.html
var testHelper = require('test/testHelper');

describe("pow", function() {

    it("при возведении 2 в 3ю степень результат 8", function() {
        assert.equal(testHelper.pow(2, 3), 8);
    });

    it("при возведении 3 в 4ю степень равен 81", function() {
        assert.equal(testHelper.pow(3, 4), 81);
    });

});
