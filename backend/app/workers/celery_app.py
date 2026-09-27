from celery import Celery

app = Celery("bhusha")
app.conf.update(task_serializer="json", accept_content=["json"], result_serializer="json")
