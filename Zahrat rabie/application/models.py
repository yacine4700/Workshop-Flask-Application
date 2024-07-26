from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from datetime import datetime
import re
import pandas as pd
import os
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Border, Side, Alignment, Protection, Font
from pathlib import Path

db = SQLAlchemy()


class Invoice(db.Model):
    __tablename__ = 'invoices'
    id = db.Column(db.String(20), primary_key=True)
    date = db.Column(db.String(20), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey(
        'customers.id'), nullable=False)
    customer_name = db.Column(db.String(20), nullable=False)
    total_products = db.Column(db.Integer, nullable=False)
    total = db.Column(db.Float, nullable=False)
    year = db.Column(db.Integer, nullable=False,
                     default=datetime.utcnow().year)
    customer = db.relationship(
        'Customer', backref=db.backref('invoices', lazy=True))


class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    amounts = db.Column(db.Float, default=0)
    paid = db.Column(db.Float, default=0)
    net = db.Column(db.Float, default=0)
    last_pay = db.Column(db.String(20), nullable=False)


class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    sales = db.Column(db.Integer, default=0)
    stock = db.Column(db.Integer, nullable=False, default=0)
    last_change = db.Column(db.String, nullable=False,
                            default=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    user = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(100), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)


def id_generator(last_id):
    current_month = datetime.now().strftime('%m')
    current_year = datetime.now().strftime('%y')
    if last_id[:2] == current_month:
        last_id_num = int(re.search(r'-(\d+)-', last_id).group(1))
        invoice_number = str(last_id_num + 1).zfill(3)
        invoice_id = f"{current_month}-{invoice_number}-{current_year}"
    else:
        invoice_number = '001'
        invoice_id = f"{current_month}-{invoice_number}-{current_year}"
    return invoice_id


def reset_yearly_data():
    current_year = datetime.now().strftime('%Y')
    db_invoice = db.session.query(Invoice).first()

    if db_invoice is not None:
        db_year = db_invoice.year

        if current_year != db_year:
            # Construct file path
            file_path = os.path.join('docs', 'annual', f'{current_year}.xlsx')

            # Create directory structure if necessary
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

            try:
                # Create a new workbook and write data to Excel sheets
                with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                    invoices = pd.read_sql(db.session.query(
                        Invoice).statement, db.session.connection())
                    invoices.to_excel(
                        writer, sheet_name='Invoices', index=False)

                    customers = pd.read_sql(db.session.query(
                        Customer).statement, db.session.connection())
                    customers.to_excel(
                        writer, sheet_name='Customers', index=False)

                    products = pd.read_sql(db.session.query(
                        Product).statement, db.session.connection())
                    products.to_excel(
                        writer, sheet_name='Products', index=False)

                # Reset data in the database tables
                db.session.query(Invoice).delete()
                db.session.query(Customer).update({Customer.amount: 0})
                db.session.query(Product).update({Product.sales: 0})

                # Commit changes
                db.session.commit()

                return True

            except Exception as e:
                # Handle potential errors during data export or database operations (optional)
                print(f"Error resetting yearly data: {e}")
                return False  # Indicate failure

    else:
        return True  # No invoices found, but function can still succeed


def update_last_change(mapper, connection, target):
    target.last_change = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# Define a function to calculate the net value


def calculate_net(mapper, connection, target):
    target.amounts = target.amounts or 0
    target.paid = target.paid or 0
    target.net = target.amounts - target.paid


# Attach the function to the before_insert and before_update events
event.listen(Customer, 'before_insert', calculate_net)
event.listen(Customer, 'before_update', calculate_net)

event.listen(Product, 'before_update', update_last_change)
event.listen(Product, 'before_insert', update_last_change)
