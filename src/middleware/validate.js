import { z } from "zod";

export const validateBody = (schema) => async (req, res, next) => {
  try {
    req.body = await schema.parseAsync(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation Error: Your request form is malformed",
        details: error.errors ? error.errors.map(e => ({ path: e.path.join('.'), message: e.message })) : []
      });
    }
    next(error);
  }
};
