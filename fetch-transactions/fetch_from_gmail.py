import os.path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
SPENDING_LABEL = 'spending'
# Get the label id by running print_label_id()
LABEL_ID = 'Label_6978996750297338417'

def initialize_service():
    """Logs into gmail and creates an API service."""
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    try:
        # Call the Gmail API
        service = build('gmail', 'v1', credentials=creds)
        return service
    except HttpError as error:
        # TODO(developer) - Handle errors from gmail API.
        print(f'An error occurred: {error}')


def print_label_id(service, label_name):
    results = service.users().labels().list(userId='me').execute()
    labels = results.get('labels', [])

    if not labels:
        print('No labels found.')
        return
    print('Labels:')
    for label in labels:
        if label['name'] == label_name:
            print(label['id'])


def get_messages(service, count=20):
    results = service.users().messages().list(userId='me', labelIds=[LABEL_ID], maxResults=count).execute()
    message_ids = [message['id'] for message in results['messages']]
    for message_id in message_ids:
        results = service.users().messages().get(userId='me', id=message_id, format='raw').execute()
        with open(f'downloads/email_raw_{message_id}.txt', 'w') as out_file:
            out_file.write(results['raw'])
    print('Dumped {} emails'.format(len(message_ids)))


def main():
    """Shows basic usage of the Gmail API.
    Lists the user's Gmail labels.
    """
    service = initialize_service()
    # print_label_id(service, label_name=SPENDING_LABEL)

    get_messages(service)


if __name__ == '__main__':
    main()