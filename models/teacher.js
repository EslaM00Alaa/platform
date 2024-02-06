const Joi = require("joi");



function validateTeacher(obj) {
    const schema = Joi.object({
      name: Joi.string().trim().required(),
      cover: Joi.string().trim(),
      mail: Joi.string().trim().required().email(),
      pass: Joi.string().trim().max(100).required(),
      subject: Joi.string().trim(),
      whats: Joi.string().trim(),
      facebook: Joi.string().trim(),
      tele: Joi.string().trim(),
      description: Joi.string().required(),
      classes: Joi.array().items(Joi.string().trim()).required(),
    });
  
    return schema.validate(obj);
  }


  
function validateLoginTeacher(obj)
{
    const schema = Joi.object({
        mail:Joi.string().trim().required(),
        pass:Joi.string().trim().max(100).required()
    })
    return schema.validate(obj)
}

function validateEmail (obj) {
    const schema = Joi.object({
        mail:Joi.string().trim().min(5).max(100).required().email(),
    })
    return schema.validate(obj)
}

function validateChangePass (obj)
{
    const schema = Joi.object({
        mail:Joi.string().trim().min(5).max(100).required().email(),
        pass:Joi.string().trim().max(300).required(),
        code:Joi.string().trim().required(),
    })
    return schema.validate(obj)
}

module.exports={validateTeacher,validateLoginTeacher,validateEmail,validateChangePass} ;
