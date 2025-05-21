class ExpressError extends Error {
    constructor(message, statusCode = 500, details = {}) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        
        // Properly capture stack trace in V8
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
    }
    
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
            stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
        };
    }
}

module.exports = ExpressError;