
class ErrorHandler extends Error{
    constructor(message, statusCode){
        // SUPER() - 1. extends the property from the parent class
                 // 2. calls the method from the parent class
        // 
        super(message);
        this.statusCode = statusCode

        Error.captureStackTrace(this, this.constructor);
    }
};
module.exports = ErrorHandler