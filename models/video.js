const Joi = require("joi");



function validateVideo(obj) {
    const schema = Joi.object({
        lo_id :joi.number(),
        lg_id :joi.number(),
        teacher_id :joi.number().required(),
        name:joi.string().required(),
        video:joi.string().required()
    });
  
    return schema.validate(obj);
  }


  


module.exports = {validateVideo} ;