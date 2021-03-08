#!/usr/bin/env python

"""Extend Python's built in HTTP server to save files

curl or wget can be used to send files with options similar to the following

  curl -X PUT --upload-file somefile.txt http://localhost:8000
  wget -O- --method=PUT --body-file=somefile.txt http://localhost:8000/somefile.txt

__Note__: curl automatically appends the filename onto the end of the URL so
the path can be omitted.

"""

import base64

import os
try:
    import http.server as server
except ImportError:
    # Handle Python 2.x
    import SimpleHTTPServer as server


exec_context = {}


def ilistdir( path ) : # mimic micropython ilistdir

    for f in os.scandir(path) :

        try :
            r = ( f.name,  0x4000 if f.is_dir() else 0x8000 , f.inode() , f.stat().st_size )
            yield r;
        except FileNotFoundError :
            pass

os.ilistdir = ilistdir




class HTTPRequestHandler(server.SimpleHTTPRequestHandler):
    """Extend SimpleHTTPRequestHandler to handle PUT requests"""

    def do_POST(self) :

        print("post", self.path )

        #data = self.rfile.read();
       

        print ( self.headers , dir(self.headers) )

        data = self.rfile.read(int(self.headers['Content-Length']))

        print ("-------------------data------------------------------")
        print (data)

        if self.path == "/play" :
            exec( data, exec_context )

        if self.path == '/eval' :

            response = str( eval( data ))
 
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.send_header("Content-Length", str( len(response) ))
        self.end_headers() 
        self.wfile.write( response.encode() )


    def do_PUT(self):

        file_length = int(self.headers['Content-Length'])
        payload = self.rfile.read(file_length)
        
        v = payload.split("&")

        m = {}
        for s in v  :
            key,value = s.split("=",1) # base64 may contain =, but we only split on the first
            if key == "payload" :
                s = value.split(",",1)[1]   
                value = base64.b64decode( s )

            m[key] = value
            # print key, value[:100]
            
        f = open( m['fn'] , 'w' )
        f.write( m['payload'] )
        del f

        print ('wrote',m['fn']," ", len(value), "bytes.")
        
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.send_header("Content-Length", str(file_length))
        self.end_headers() 

        return
    

print("serving..")

if __name__ == '__main__':
    server.test(HandlerClass=HTTPRequestHandler)
