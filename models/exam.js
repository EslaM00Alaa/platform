const joi = require("joi");



function validateExam(obj)
{
    const schema = joi.object({
      lo_id :joi.number(),
      lg_id :joi.number(),
      teacher_id :joi.number().required(),
      name:joi.string().required(),
      number:joi.number().required()
    })
    return schema.validate(obj)
}

function validateQuestion(obj)
{
    const schema = joi.object({
      exam_id :joi.number().required(),
      teacher_id :joi.number().required(),
      question:joi.string().required(),
      answer1:joi.string().required(),
      answer2:joi.string().required(),
      answer3:joi.string().required(),
      answer4:joi.string().required(),
      correctAnswer:joi.number().required(),
      degree:joi.number().required(),
    })
    return schema.validate(obj)
}


module.exports={validateExam,validateQuestion} ;
