from datetime import datetime
import pytz

def vietnam_now():
    return datetime.now(pytz.timezone('Asia/Ho_Chi_Minh'))
