import os
from dotenv import load_dotenv
load_dotenv()

sid   = os.getenv('TWILIO_SID', '')
auth  = os.getenv('TWILIO_AUTH', '')
phone = os.getenv('TWILIO_PHONE', '')

sid_status   = 'OK' if sid   else 'MISSING'
auth_status  = 'OK' if auth  else 'MISSING'
phone_status = 'OK' if phone else 'MISSING'

print(f'TWILIO_SID   = {sid[:10]}... [{sid_status}]')
print(f'TWILIO_AUTH  = {auth[:6]}... [{auth_status}]')
print(f'TWILIO_PHONE = {phone} [{phone_status}]')

if sid and auth:
    try:
        from twilio.rest import Client
        client = Client(sid, auth)
        # Just validate by listing account (does not send anything)
        account = client.api.accounts(sid).fetch()
        print(f'\n[OK] Twilio credentials valid! Account: {account.friendly_name}')
    except Exception as e:
        print(f'\n[ERROR] Twilio credential check failed: {e}')
else:
    print('\n[WARN] Credentials missing — cannot verify Twilio connection')
