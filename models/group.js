const joi = require("joi");



function validateGroup(obj)
{
    const schema = joi.object({
       teacher_id:joi.number().required(),
       group_name:joi.string().trim().required(),
       grad:joi.string().trim().required()
    })
    return schema.validate(obj)
}


module.exports=validateGroup ;
