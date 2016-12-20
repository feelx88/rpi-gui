#!/usr/bin/env python2
"""
Creates an HTTP server with websocket communication.
"""
import base64
import os
import time
import threading
import picamera

try:
    import cStringIO as io
except ImportError:
    import io

import tornado.web
import tornado.websocket
from tornado.ioloop import PeriodicCallback

camera = picamera.PiCamera()
camera.start_preview()
camera.resolution = (320, 240)

class WebSocket(tornado.websocket.WebSocketHandler):

    def on_message(self, message):
        """Evaluates the function pointed to by json-rpc."""

        # Start an infinite loop when this is called
        if message == "read_camera":
            self.camera_loop = PeriodicCallback(self.loop, 10)
            self.camera_loop.start()

        # Extensibility for other methods
        else:
            print("Unsupported function: " + message)

    def loop(self):
        """Sends camera images in an infinite loop."""
        sio = io.StringIO()
        camera.capture(sio, "jpeg", use_video_port=True)

        try:
            self.write_message(base64.b64encode(sio.getvalue()))
        except tornado.websocket.WebSocketClosedError:
            self.camera_loop.stop()

handlers = [(r"/api/camera/websocket", WebSocket)]
application = tornado.web.Application(handlers)
application.listen(8000)

tornado.ioloop.IOLoop.instance().start()
