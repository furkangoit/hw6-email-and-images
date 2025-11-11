// schemas/users.js (veya ilgili Joi şema dosyanız)
import Joi from "joi";

// ... (diğer şemalarınız, örn: registerSchema, loginSchema)

export const sendResetEmailSchema = Joi.object({
  email: Joi.string().email().required(),
});