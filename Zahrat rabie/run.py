from application import create_app
# from flaskwebgui import FlaskUI

app = create_app()

if __name__ == '__main__':
    # FlaskUI(app=app, server="flask").run()
    app.run(port=9000, debug=True, host='0.0.0.0')
