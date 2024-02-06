const joi = require("joi");



function validateAdmin(obj)
{
    const schema = joi.object({
        mail:joi.string().trim().required(),
        pass:joi.string().trim().max(100).required(),
    })
    return schema.validate(obj)
}


module.exports=validateAdmin ;
