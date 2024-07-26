from flask import Flask, render_template, jsonify, request, session, url_for, render_template_string, flash, send_from_directory
from flask_migrate import Migrate
from werkzeug.security import check_password_hash, generate_password_hash
from .models import db, Invoice, Customer, User, Product, id_generator, reset_yearly_data
from .analysis import SalesAnalysis
import os
from weasyprint import HTML, CSS
import pandas as pd
from datetime import datetime


class Config:

    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    basedir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(os.getcwd(), 'data', 'zahrat.db')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL') or f'sqlite:///{db_path}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False


def create_app():
    basedir = os.getcwd()
    app = Flask(__name__,
                static_folder=basedir + r'\static',
                template_folder=basedir + r'\templates')
    app.config.from_object(Config)
    db.init_app(app)
    migrate = Migrate(app, db)

    @app.context_processor
    def inject_is_admin():
        return dict(is_admin=session.get('is_admin'), is_user=session.get('is_user'))

    # format currency function
    def format_currency(value):
        return "{:,.2f} د.ج".format(value)

    app.jinja_env.filters['format_currency'] = format_currency
    # get data of inv + customers + products

    @app.route('/api/data')
    def get_data():
        customers = Customer.query.all()
        products = Product.query.all()
        invoices = Invoice.query.all()
        last_invoice = Invoice.query.order_by(Invoice.id.desc()).first()
        last_id = last_invoice.id if last_invoice else '00-000-00'
        nxt_id = id_generator(last_id)
        customers_list = [{
            'id': customer.id,
            'name': customer.name,
            'address': customer.address,
            'phone': customer.phone,
            'amounts': customer.amounts,
            'paid': customer.paid,
            'net': customer.net,
            'last_pay': customer.last_pay
        } for customer in customers]
        products_list = [{
            'id': product.id,
            'name': product.name,
            'price': product.price,
            'sales': product.sales,
            'stock': product.stock,
            'last_change': product.last_change
        } for product in products]
        invoices_list = [{
            'id': invoice.id,
            'date': invoice.date,
            'cust_id': invoice.customer_id,
            'name': invoice.customer_name,
            'products': invoice.total_products,
            'total': invoice.total
        } for invoice in invoices]
        return jsonify({'customers': customers_list,
                        'products': products_list,
                        'invoiceId': nxt_id,
                        'is_admin': session.get('is_admin', False),
                        'invoices': invoices_list})

    # home page
    @app.route('/')
    def home():
        if reset_yearly_data():
            # flash message
            curr_y = datetime.now().strftime('%Y')
            flash(f'أهلا بك في السنة المالية الجديدة {curr_y}!', 'success')

        return render_template('home.html')

    # stock page

    @app.route('/stock')
    def stock():
        return render_template('stock.html')

    # receipt page
    @app.route('/receipt', methods=['GET', 'POST'])
    def receipt():
        return render_template('receipt.html')

    # receipt template page
    @app.route('/invtemplate/<invoice_id>')
    def invtemplate(invoice_id):
        invoices_data = session.get('invoices_data', None)
        if invoices_data and invoices_data['invoiceId'] == invoice_id:
            template_data = {
                'invoice_number': invoices_data['invoiceId'],
                'invoice_date': invoices_data['date'],
                'invoice_total': invoices_data['total'],
                'invoice_verssement': invoices_data['verssement'],
                'customer_name': invoices_data['customer'],
                'customer_address': invoices_data['address'],
                'customer_phone': invoices_data['phone'],
                'table_items': invoices_data['tableData'],
            }
            # Extract table_items
            table_items = template_data['table_items']
            # Processed data
            new_data = {}

            for entry in table_items:
                # Extract the product name
                product_name = entry['item'].split('(')[0].strip()

                # If the product is not yet in the new_data dictionary, add it
                if product_name not in new_data:
                    new_data[product_name] = {
                        'item': product_name, 'qty': 0, 'price': entry['price'], 'subtotal': 0}

                # Update the quantity and subtotal
                new_data[product_name]['qty'] += int(entry['qty'])
                new_data[product_name]['subtotal'] += float(entry['subtotal'])
            invoice = list(new_data.values())
            session['invoice'] = invoice
            rendered_html = render_template(
                'invtemplate.html', **template_data, invoice=invoice)
            return rendered_html
        else:
            return "Invoice not found or session expired", 404

    # analysis page
    @app.route('/invoices')
    def invoices_list():
        invoices = Invoice.query.all()
        return render_template('analysis.html', invoices=invoices)

    # products list page
    @app.route('/products')
    def products_list():
        products = Product.query.all()
        return render_template('products-list.html', products=products)

    # customers list page
    @app.route('/customers')
    def customers_list():
        customers = Customer.query.all()
        return render_template('customers-list.html', customers=customers)

    # add new customer
    @app.route('/postcustomer', methods=['POST'])
    def post_customer():
        new_customer = request.json
        customer = Customer(
            name=new_customer['custName'], address=new_customer['custAddress'], phone=new_customer['custPhone'])
        db.session.add(customer)
        db.session.commit()
        return jsonify({"msg": f"تمت إضافة {new_customer['custName']} بنجاح!"})

    # add new product
    @app.route('/postproduct', methods=['POST'])
    def post_product():
        new_prod = request.json
        product = Product(
            name=new_prod['prodName'], price=new_prod['prodPrice'])
        db.session.add(product)
        db.session.commit()
        return jsonify({"msg": f"تمت إضافة {new_prod['prodName']} بنجاح!"})

    # edit product
    @app.route('/updateproduct', methods=['POST'])
    def update_product():
        updated_prod = request.json
        product = Product.query.get(updated_prod['prodId'])
        product.name = updated_prod['prodName']
        product.price = updated_prod['prodPrice']
        db.session.commit()
        return jsonify({"msg": f"تم تعديل {updated_prod['prodName']} بنجاح!"})

    # edit customer
    @app.route('/updatecustomer', methods=['POST'])
    def update_customer():
        updated_cust = request.json
        customer = Customer.query.get(updated_cust['custId'])
        customer.name = updated_cust['custName']
        customer.address = updated_cust['custAdr']
        customer.phone = updated_cust['custPhone']
        db.session.commit()
        return jsonify({"msg": f"تم تعديل معلومات {updated_cust['custName']} بنجاح!"})

    # remove product
    @app.route('/deleteproduct', methods=['POST'])
    def delete_product():
        deleted_prod = request.json
        product = Product.query.get(deleted_prod)
        db.session.delete(product)
        db.session.commit()
        return jsonify({"msg": "تم حذف المنتج بنجاح!"})

    # remove customer
    @app.route('/deletecustomer', methods=['POST'])
    def delete_customer():
        deleted_cust = request.json
        customer = Customer.query.get(deleted_cust)
        db.session.delete(customer)
        db.session.commit()
        return jsonify({"msg": "تم حذف الزبون بنجاح!"})

    # redirect receipt page route
    @app.route('/receiptsData', methods=['POST'])
    def receiptsData():
        if request.method == 'POST':
            invoices_data = request.json
            session['invoices_data'] = invoices_data
            return jsonify({'redirect_url': url_for('invtemplate', invoice_id=invoices_data['invoiceId'])})

    # pdf generating

    @app.route('/generate_pdf', methods=['POST'])
    def generate_pdf():
        # get invoice data from session
        invoices_data = session.get('invoices_data', None)
        invoice = session.get('invoice', None)
        template_data = {
            'invoice_number': invoices_data['invoiceId'],
            'invoice_date': invoices_data['date'],
            'invoice_total': invoices_data['total'],
            'invoice_verssement': invoices_data['verssement'],
            'customer_name': invoices_data['customer'],
            'customer_address': invoices_data['address'],
            'customer_phone': invoices_data['phone'],
            'total_products': invoices_data['totalProducts'],
        }
        # template to generate pdf
        rendered_html = render_template(
            'invoice_pdf.html', **template_data, invoice=invoice)
        # pdf parameter
        css_paths = [
            os.path.join(basedir, 'static/css/bootstrap.rtl.min.css'),
        ]
        css_files = [CSS(filename=path) for path in css_paths]
        current_year = datetime.now().strftime('%Y')
        current_month = datetime.now().strftime('%m')

        pdf_dir = os.path.join(basedir, 'docs', 'customers',
                               'bons', f'{current_year}', f'{current_month}')
        os.makedirs(pdf_dir, exist_ok=True)
        pdf_file_name = f'invoice_{template_data["invoice_number"]}.pdf'
        pdf_file_path = os.path.join(pdf_dir, pdf_file_name)

        # save pdf
        HTML(string=rendered_html).write_pdf(
            pdf_file_path, stylesheets=css_files)
        # save in db
        # add amount
        customer = Customer.query.filter_by(
            id=invoices_data['customerId']).first()
        customer.amounts += float(invoices_data['total'])
        customer.paid += float(invoices_data['verssement'])
        # invoice adding
        invoice = Invoice(
            id=invoices_data['invoiceId'],
            date=invoices_data['date'],
            customer_id=customer.id,
            customer_name=invoices_data['customer'],
            total_products=invoices_data['totalProducts'],
            total=invoices_data['total']
        )
        db.session.add(invoice)

        # product qty growing in db
        for id, qty in invoices_data['productsQtys'].items():
            product = Product.query.filter_by(
                id=id).first()
            product.sales += int(qty)
            product.stock -= int(qty)

        # save changes
        db.session.commit()

        return render_template_string('''
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>Close Tab</title>
            <script type="text/javascript">
                window.close();
            </script>
        </head>
        <body></body>
        </html>
    ''')

    # generate report of sales JSON
    @app.route('/sales_report', methods=['GET'])
    def get_sales_report():
        analysis = SalesAnalysis()
        report = analysis.generate_sales_report_by_year()
        # Ensure all date-related fields are converted to strings
        for section in ['sales_by_customer', 'sales_by_month', 'sales_growth_rate', 'top_customers', 'top_products']:
            report[section] = [
                {key: (str(value) if isinstance(value, pd.Period) else value)
                 for key, value in item.items()}
                for item in report[section]
            ]
        return jsonify(report)

    # add stock elements
    @app.route('/stock_add', methods=['POST'])
    def stock_add():
        prod_data = request.json
        product_id = prod_data['productId']
        quantity_to_add = int(prod_data['quentity'])
        product = Product.query.get(product_id)
        product.stock += quantity_to_add
        db.session.commit()
        return jsonify({"message": "تم تحديث المخزون بنجاح!"}), 200

    # edit invoice
    @app.route('/modify_invoice', methods=['POST'])
    def modify_invoice():
        invoice_data = request.json
        invoice = Invoice.query.get(invoice_data['invoiceId'])
        # modify total
        differance_total = int(invoice_data['differance'])
        invoice.total += differance_total
        # modify customer total
        customer_id = invoice.customer_id
        customer = Customer.query.get(customer_id)
        customer.amounts += differance_total
        db.session.commit()
        return jsonify({"message": f"تم تحديث الوصل {invoice_data['invoiceId']} بنجاح!"}), 200

    # add verssement
    @app.route('/pay_verssement', methods=['POST'])
    def pay_verssement():
        verssement_data = request.json
        customer = Customer.query.get(verssement_data['customerId'])
        # add verssement
        customer.paid += int(verssement_data['verssement'])
        customer.last_pay = verssement_data['verssementDate']
        db.session.commit()
        return jsonify({"message": f"تم تحديث حساب {customer.name} بنجاح!"}), 200

    # open invoice
    @app.route('/docs/<int:year>/<int:month>/<path:filename>')
    def open_invoice(year, month, filename):
        pdf_dir = os.path.join(basedir, 'docs', 'customers',
                               'bons', f'{year}', f'{month:02d}')

        try:
            return send_from_directory(pdf_dir, filename)
        except FileNotFoundError:
            print(FileNotFoundError.errno)

    # login
    @app.route('/login', methods=['POST'])
    def login():
        password = request.json
        users = User.query.all()
        for user in users:
            if user.password == password:
                session['is_admin'] = user.is_admin
                if user.is_admin:
                    session['is_user'] = False
                    return jsonify({'message': 'Welcome admin', 'is_admin': user.is_admin})
                else:
                    session['is_user'] = True
                    return jsonify({'message': 'Welcome user', 'is_admin': user.is_admin})

        return jsonify({'message': 'Invalid credentials'}), 401

    # reset password
    @app.route('/reset_password', methods=['POST'])
    def reset_password():
        user_data = request.json
        password = user_data['password']
        new_password = user_data['newPassword']
        users = User.query.all()
        for user in users:
            if password == user.password and user.is_admin == session.get('is_admin'):
                user.password = new_password
                db.session.commit()
                return jsonify({'change': True})
        return jsonify({'message': 'Invalid credentials'}), 401

    # logout
    @app.route('/logout', methods=['POST'])
    def logout():
        session.pop('is_admin', None)
        session.pop('is_user', None)
        return jsonify({'message': 'Logged out successfully'})

    # @app.route('/api/sales_report/<int:year>', methods=['GET'])
    # def get_sales_report(year):
    #     analysis = SalesAnalysis()
    #     report = analysis.generate_sales_report_by_year(year)
    #     # Ensure all date-related fields are converted to strings
    #     for section in ['sales_by_customer', 'sales_by_month', 'sales_growth_rate', 'top_customers', 'top_products']:
    #         report[section] = [
    #             {key: (str(value) if isinstance(value, pd.Period) else value)
    #              for key, value in item.items()}
    #             for item in report[section]
    #         ]
    #     return jsonify(report)

    return app
