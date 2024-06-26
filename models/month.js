const Joi = require("joi");




  

function validateMonth(obj) {
    const schema = Joi.object({
     teacher_id : Joi.number().required(),
     grad_id:Joi.string().trim().required(),
     cover:Joi.string().trim(),
     description:Joi.string().trim().required(),
     price:Joi.number(),
     days:Joi.number().required(),
    });
  
    
    return schema.validate(obj);
  }
  


module.exports = {validateMonth} ;