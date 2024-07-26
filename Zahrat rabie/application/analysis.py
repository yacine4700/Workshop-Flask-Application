import pandas as pd
from .models import db, Invoice, Product, Customer


class SalesAnalysis:
    def __init__(self):
        self.invoices = pd.DataFrame(self.load_invoices())
        self.products = pd.DataFrame(self.load_products())
        self.customers = pd.DataFrame(self.load_customers())

    def load_invoices(self):
        invoices = Invoice.query.all()
        data = []
        for inv in invoices:
            customer_name = inv.customer.name if inv.customer else 'زبون غير معروف'
            data.append({
                'id': inv.id,
                'date': inv.date,
                'customer': customer_name,
                'total_products': inv.total_products,
                'total': inv.total
            })
        return data

    def load_products(self):
        products = Product.query.all()
        data = [{
            'id': prod.id,
            'name': prod.name,
            'price': prod.price,
            'sales': prod.sales
        } for prod in products]
        return data

    def load_customers(self):
        customers = Customer.query.all()
        data = [{
            'id': cust.id,
            'name': cust.name,
            'address': cust.address,
            'phone': cust.phone
        } for cust in customers]
        return data

    def total_sales(self):
        return self.invoices['total'].sum()

    def total_sales_by_customer(self):
        return self.invoices.groupby('customer')['total'].sum().reset_index()

    def total_sales_by_month(self):
        self.invoices['date'] = pd.to_datetime(self.invoices['date'])
        self.invoices['month'] = self.invoices['date'].dt.to_period('M')
        monthly_sales = self.invoices.groupby('month').agg(
            total_sales=pd.NamedAgg(column='total', aggfunc='sum'),
            invoice_count=pd.NamedAgg(column='date', aggfunc='count')
        ).reset_index()
        return monthly_sales

    def top_customers(self, n=5):
        sales_by_customer = self.total_sales_by_customer()
        return sales_by_customer.sort_values(by='total', ascending=False).head(n)

    def top_products(self, n=5):
        # Extract the radical name before '('
        self.products['radical_name'] = self.products['name'].str.split(
            '(').str[0].str.strip()

        # Group by the radical name and aggregate the sales
        grouped_products = self.products.groupby(
            'radical_name', as_index=False).agg({'sales': 'sum'})

        # Calculate the total sales
        total_sales = grouped_products['sales'].sum()

        # Calculate the percentage of sales for each product
        grouped_products['sales_percentage'] = (
            grouped_products['sales'] / total_sales) * 100

        # Select the top n products by sales
        top_products = grouped_products.sort_values(
            by='sales', ascending=False).head(n)

        return top_products[['radical_name', 'sales', 'sales_percentage']]

    def customer_purchase_history(self, customer_id):
        customer_invoices = self.invoices[self.invoices['customer']
                                          == customer_id]
        return customer_invoices

    def sales_growth_rate(self):
        self.invoices['date'] = pd.to_datetime(self.invoices['date'])
        self.invoices['month'] = self.invoices['date'].dt.to_period('M')
        monthly_sales = self.invoices.groupby(
            'month')['total'].sum().pct_change().reset_index()
        monthly_sales.columns = ['month', 'growth_rate']
        monthly_sales['growth_rate'].fillna(
            0, inplace=True)  # Replace NaN with 0
        return monthly_sales

    def sales_distribution(self):
        return self.invoices['total'].describe().loc[['count', 'mean', 'min', 'max']].reset_index()

    def load_years(self):
        years = db.session.query(Invoice.year.distinct()).all()
        return [year[0] for year in years]

    def load_invoices_by_year(self, year):
        invoices = Invoice.query.filter_by(year=year).all()
        data = []
        for inv in invoices:
            customer_name = inv.customer.name if inv.customer else 'زبون غير معروف'
            data.append({
                'id': inv.id,
                'date': inv.date,
                'customer': customer_name,
                'total_products': inv.total_products,
                'total': inv.total
            })
        return data

    def generate_sales_report_by_year(self):
        report = {
            'total_sales': self.total_sales(),
            'sales_by_customer': self.total_sales_by_customer().to_dict(orient='records'),
            'sales_by_month': self.total_sales_by_month().to_dict(orient='records'),
            'top_customers': self.top_customers().to_dict(orient='records'),
            'top_products': self.top_products().to_dict(orient='records'),
            'sales_growth_rate': self.sales_growth_rate().to_dict(orient='records'),
            'sales_distribution': self.sales_distribution().to_dict(orient='records')
        }
        return report
    # def generate_sales_report_by_year(self, year):
    #     self.invoices = pd.DataFrame(self.load_invoices_by_year(year))
    #     report = {
    #         'total_sales': self.total_sales(),
    #         'sales_by_customer': self.total_sales_by_customer().to_dict(orient='records'),
    #         'sales_by_month': self.total_sales_by_month().to_dict(orient='records'),
    #         'top_customers': self.top_customers().to_dict(orient='records'),
    #         'top_products': self.top_products().to_dict(orient='records'),
    #         'sales_growth_rate': self.sales_growth_rate().to_dict(orient='records'),
    #         'sales_distribution': self.sales_distribution().to_dict(orient='records')
    #     }
    #     return report
