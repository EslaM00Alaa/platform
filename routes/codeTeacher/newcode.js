const joi = require("joi");

function validateCreateCode(obj) {
    const schema = joi.object({
        number : joi.number().integer().required(), // 
        teacher_id: joi.number().integer().required(), // teacher_id should be an integer and is required
    });

    return schema.validate(obj);
}

module.exports = validateCreateCode ; 