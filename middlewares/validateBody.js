import createHttpError from "http-errors";

const validateBody = (schema) => {
  const func = (req, res, next) => {
    // Joi'nin, form-data'dan gelen text alanlarını doğrulamasını sağlıyoruz
    // (Resim yükleme (Adım 6) için bu gereklidir)
    const { error } = schema.validate(req.body); 
    if (error) {
      return next(createHttpError(400, error.message));
    }
    next();
  };
  return func;
};

export default validateBody;
