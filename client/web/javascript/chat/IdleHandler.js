var IdleHandler = function() {
    var self = this;
    
    self.idleTimeout = 120 * 1000;

    self.app = null;
    self.unreadMessages = 0;
    self.subscription = null;
    self.idle = false;
    
    self.normalIcon = null;
    self.icons = {};
    
    self.Bind = function( app ) {
        self.app = app;

        self.app.events.addListener( 'API loaded', function( api ) {
            var favIcon = document.getElementById( 'favicon' );
            if ( favIcon )
            {
                self.normalIcon = favIcon.getAttribute( 'href' );
            }
            
            if ( api.icons )
            {
                self.icons[ 'active' ] = api.icons.active;
                self.icons[ 'inactive' ] = api.icons.inactive;
            }
        });
        
        self.app.events.addListener( 'joined room', self.Watch );

        $.idleTimer( self.idleTimeout, document, {
            events: 'mousemove keydown mousewheel mousedown touchstart touchmove' // DOMMouseScroll, nope, scroll to bottom emits this
        });

        if ( document.addEventListener )
        {
            var changeEvents = {
                hidden: "visibilitychange",
                mozHidden: "mozvisibilitychange",
                webkitHidden: "webkitvisibilitychange",
                msHidden: "msvisibilitychange",
                oHidden: "ovisibilitychange"
            };
            
            for ( var changeEvent in changeEvents )
            {
                if ( changeEvent in document )
                {
                    document.addEventListener( changeEvents[ changeEvent ], function() {
                        if ( document[ changeEvent ] )
                        {
                            self.SetIdle();
                        }
                        else
                        {
                            self.SetActive();
                        }
                    });
                    break;
                }
            }
        }
        
        $( document ).bind( 'idle.idleTimer', self.SetIdle );
        $( document ).bind( 'active.idleTimer', self.SetActive );
    }
    
    self.SetIdle = function() {
        if ( self.idle || !self.app.client || !self.app.room || !self.app.user )
        {
            return;
        }
        
        self.idle = true;

        self.app.SendMessage({
            kind: 'idle'
        });
        
        self.app.events.emit( 'idle' );
    }
    
    self.SetActive = function() {
        if ( !self.idle || !self.app.client || !self.app.room || !self.app.user )
        {
            return;
        }
        
        self.idle = false;

        self.unreadMessages = 0;
        document.title = self.app.room.name + ' on Grmble';

        self.SetFavIcon( self.normalIcon );

        self.app.SendMessage({
            kind: 'active'
        });
        
        self.app.events.emit( 'active' );
    }
    
    self.Watch = function() {
        if ( !self.app.room )
        {
            return;
        }

        self.unreadMessages = 0;
        
        if ( self.subscription )
        {
            self.subscription.cancel();
            self.subscription = null;
        }
        
        self.subscription = self.app.client.subscribe( '/room/' + self.app.room._id, function( message ) {
            
            if ( message.kind != 'say' )
            {
                return;
            }
            
            if ( self.idle )
            {
                $( '#message-sound' )[ 0 ].play();
                
                ++self.unreadMessages;
                document.title = '(' + self.unreadMessages + ') ' + self.app.room.name + ' on Grmble';
             
                if ( !self.activityIndicatorTimeout )
                {
                    self.IndicateActivity();
                }
            }
        });
    }
    
    self.IndicateActivity = function() {
        if ( $.data( document, 'idleTimer' ) == 'idle' )
        {
            var state = document.getElementById( 'favicon' ).getAttribute( 'data-icon' ) == 'active' ? 'inactive' : 'active';
            favIcon = self.SetFavIcon( self.icons[ state ] );
            favIcon.setAttribute( 'data-icon', state );

            self.activityIndicatorTimeout = setTimeout( self.IndicateActivity, 1000 );
        }
        else
        {
            self.activityIndicatorTimeout = null;
        }
    }
    
    self.SetFavIcon = function( url ) {
        var head = document.getElementsByTagName( 'head' )[ 0 ];
        var favIcon = document.getElementById( 'favicon' );

        head.removeChild( favIcon );
        
        favIcon = document.createElement( 'link' );
        favIcon.id = 'favicon';
        favIcon.type = 'image/png';
        favIcon.rel = 'shortcut icon';
        favIcon.href = url;
        
        head.appendChild( favIcon );

        return favIcon;
    }
}