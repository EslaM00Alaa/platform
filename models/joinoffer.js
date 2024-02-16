const joi = require("joi");



function validateAdmin(obj)
{
    const schema = joi.object({
        group_id:joi.number().required(),
        mail:joi.string().trim().max(100).required(),
    })
    return schema.validate(obj)
}


module.exports=validateAdmin ;
