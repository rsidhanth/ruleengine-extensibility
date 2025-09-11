#!/usr/bin/env python3

import os
import sys
import django

# Setup Django
sys.path.append('/Users/sid/Documents/Extensibility')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rule_engine_backend.settings')
django.setup()

from workflows.rule_engine_service import SimpleRuleEngine

# Test the rule execution
rule_definition = '''call action "Get Document" from connector "Leegality Sandbox" with {
      "documentId": {{irn}}
  } map response {
      "data.document.name" to @doc.document_name
  }'''

context_data = {
    'irn': 'TEST123',
    'customer_id': 'CUST456',
    'documents': [
        {
            'document_name': '',
            'document_id': '',
            'document_status': '',
            'invitee_name': '',
            'invitee_email': ''
        }
    ]
}

print("="*60)
print("Testing Rule Execution")
print("="*60)
print(f"Rule: {repr(rule_definition)}")
print(f"Context: {context_data}")
print("="*60)

engine = SimpleRuleEngine()
result = engine.execute_rule(rule_definition, context_data)

print("RESULT:")
print(f"Success: {result['success']}")
print(f"Error: {result.get('error')}")
if 'result' in result:
    print(f"Assignments: {result['result'].get('assignments', {})}")
    print(f"Errors: {result['result'].get('errors', [])}")
    print(f"Action Logs: {result['result'].get('action_logs', [])}")

print("="*60)