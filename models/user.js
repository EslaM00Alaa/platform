const joi = require("joi");



function validateUser(obj)
{
    const schema = joi.object({
        fName:joi.string().trim().required(),
        lName:joi.string().trim().required(),
        mail:joi.string().trim().required(),
        pass:joi.string().trim().max(300).required(),
        lastVerifyCode:joi.string().trim(),
        phone:joi.string().trim(),
        grad:joi.number(),
    })
    return schema.validate(obj)
}

function validateLoginUser(obj)
{
    const schema = joi.object({
        mail:joi.string().trim().required(),
        pass:joi.string().trim().max(100).required()
    })
    return schema.validate(obj)
}

function validateEmail (obj) {
    const schema = joi.object({
        mail:joi.string().trim().min(5).max(100).required().email(),
    })
    return schema.validate(obj)
}

function validateChangePass (obj)
{
    const schema = joi.object({
        mail:joi.string().trim().min(5).max(100).required().email(),
        pass:joi.string().trim().max(300).required(),
        code:joi.string().trim().required(),
    })
    return schema.validate(obj)
}


module.exports= {validateUser,validateLoginUser,validateEmail,validateChangePass} ;