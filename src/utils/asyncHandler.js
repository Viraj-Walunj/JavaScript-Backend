// Accepts a 'requestHandler' function as an argument and returns a brand new Express middleware function
const asyncHandler = (requestHandler) => { 
    // FIX: Added 'return' so Express can actually see and execute the inner middleware function
    return (req, res, next) => {
        // Forces the return value of your handler into a Promise, making it safe even if it's not explicitly marked async
        Promise.resolve(
            // Executes your actual controller logic (like registering a user), passing the Express objects
            requestHandler(req, res, next)
        )
        // If the code throws an error or rejects, '.catch()' intercepts it and forwards it to your global error middleware
        .catch((err) => next(err)) 
    }
}
// Exports the utility function so you can wrap your route controllers with it elsewhere
export { asyncHandler }



//OR 

/*
Process (steps)
const asyncHandler = () => {}
const asyncHandler = (function) => { () => {} }
const asyncHandler = (function) => async() => {}
*/
/*

// A higher-order function that takes your route controller 'fn' and returns an async middleware function
const asyncHandler = (fn) => async (req, res, next) => {
    // Tries to execute the controller code normally
    try {
        // Executes your controller function and waits for it to complete entirely
        await fn(req, res, next)
    }
    // Catches any error thrown anywhere inside the execution of your controller function
    catch (error) {
        // Sends an immediate HTTP response status using the error's code, or falls back to a 500 Server Error
        res.status(error.code || 500).json({
            // Explicitly tells the client that the request failed
            success: false,
            // Sends back the specific error message text to let the developer/client know what went wrong
            message: error.message
        })
    }
}

*/
