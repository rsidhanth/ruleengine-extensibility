#!/usr/bin/env python3

import re

# Your exact rule text
rule_text = '''call action "Get Document" from connector "Leegality Sandbox" with {
      "documentId": {{irn}}
  } map response {
      "data.document.name" to @doc.document_name
  }'''

# Fixed regex pattern - handle nested double braces properly
action_pattern = r'call\s+action\s+"([^"]+)"\s+from\s+connector\s+"([^"]+)"\s+with\s*\{((?:[^{}]|\{\{[^}]*\}\}|\{[^}]*\})*)\}\s*map\s+response\s*\{((?:[^{}]|\{\{[^}]*\}\}|\{[^}]*\})*)\}'

print("Rule text:")
print(repr(rule_text))
print("\nPattern:")
print(repr(action_pattern))

# Test the pattern
matches = re.finditer(action_pattern, rule_text, re.IGNORECASE | re.DOTALL)
found = False
for match in matches:
    found = True
    print(f"\nMATCH FOUND!")
    print(f"Action: '{match.group(1)}'")
    print(f"Connector: '{match.group(2)}'")
    print(f"Params: '{match.group(3)}'")
    print(f"Mappings: '{match.group(4)}'")

if not found:
    print("\nNO MATCH FOUND")
    
    # Test individual parts
    test_patterns = [
        (r'call\s+action\s+"([^"]+)"', "call action"),
        (r'from\s+connector\s+"([^"]+)"', "from connector"), 
        (r'with\s*\{(.*?)\}', "with params"),
        (r'map\s+response\s*\{(.*?)\}', "map response")
    ]
    
    for pattern, name in test_patterns:
        matches = re.findall(pattern, rule_text, re.IGNORECASE | re.DOTALL)
        print(f"{name}: {matches}")

# Let's also try a simpler approach that handles newlines better
print("\n" + "="*50)
print("TRYING NORMALIZED VERSION:")

# Normalize the rule text (remove extra whitespace)
normalized_rule = ' '.join(rule_text.split())
print("Normalized rule:")
print(repr(normalized_rule))

matches = re.finditer(action_pattern, normalized_rule, re.IGNORECASE | re.DOTALL)
found = False
for match in matches:
    found = True
    print(f"\nMATCH FOUND IN NORMALIZED!")
    print(f"Action: '{match.group(1)}'")
    print(f"Connector: '{match.group(2)}'")
    print(f"Params: '{match.group(3)}'")
    print(f"Mappings: '{match.group(4)}'")

if not found:
    print("Still no match in normalized version")