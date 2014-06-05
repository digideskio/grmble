var async = require( 'async' );

var Sessions = module.exports = function( options ) {
    var self = this;
    
    options.app.post( '/api/1.0/Session', options.checks.user, function( request, response ) {
        options.models.AuthToken.findOne( { 'owner': request.user._id }, function( error, authToken ) {
            if ( error )
            {
                response.json( error, 500 );
                return;
            }
            
            var user = request.user.toObject();
            delete user.passwordHash;
            
            async.series( [
                // check auth token
                function( callback ) {
                    if ( authToken && authToken.expires > new Date() )
                    {
                        callback();
                        return;
                    }
                    
                    var expires = new Date();
                    expires.setFullYear( expires.getFullYear() + 1 );
                    authToken = new options.models.AuthToken();
                    authToken.token = utils.security.GenerateAuthToken( request.user );
                    authToken.expires = expires;
                    authToken.owner = request.user._id;
                    authToken.save( callback );
                }
            ], function( error ) {
                if ( error )
                {
                    response.json( error, 500 );
                    return;
                }
                
                response.cookie( 'authtoken', authToken.token, { maxAge: authToken.expires - new Date(), httpOnly: true, path: '/' } );
                
                response.json( {
                    created: true,
                    user: user
                } );
            } );
        } );
    } );
    
    options.app.del( '/api/1.0/Session', options.checks.user, function( request, response ) {
        if ( !request.user )
        {
            response.json( 'No current session.', 404 );
            return;
        }
    
        delete request.user;
        response.cookie( 'authtoken', '', { maxAge: -100000, httpOnly: true, path: '/' } );
        response.json( {
            removed: true
        } );
    } );    
}

Sessions.prototype.Interface = {
    session: '/api/1.0/Session'
}