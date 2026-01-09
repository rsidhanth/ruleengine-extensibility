import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  ModalTypes,
  Card,
  CardTypes,
  BadgeTypes,
  BadgeSizes,
  ButtonTypes,
  Loading,
} from '@leegality/leegality-react-component-library';
import Icon from '@leegality/leegality-react-component-library/dist/icon';
import { GitBranch } from 'react-feather';

// Icon render helper for Leegality components
const getRenderIcon = (IconComponent) =>
  IconComponent ? ({ size, color }) => <Icon icon={IconComponent} size={size} color={color} /> : null;

// Mock templates - in production, this would come from an API
const mockTemplates = [
  {
    id: 1,
    name: 'Erasure Request',
    description: 'Handle user data erasure requests in compliance with privacy regulations',
    category: 'Privacy Compliance',
    nodeCount: 6,
    trigger: 'Erasure Request Event',
  },
  {
    id: 2,
    name: 'Consent Withdrawal',
    description: 'Process user consent withdrawal and update consent records',
    category: 'Consent Management',
    nodeCount: 5,
    trigger: 'Consent Withdrawal Event',
  },
  {
    id: 3,
    name: 'Account Closure',
    description: 'Complete account closure workflow including data retention and deletion',
    category: 'User Management',
    nodeCount: 7,
    trigger: 'Account Closure Request Event',
  },
  {
    id: 4,
    name: 'Purpose Expiry',
    description: 'Handle data processing purpose expiration and compliance actions',
    category: 'Data Governance',
    nodeCount: 4,
    trigger: 'Purpose Expiry Event',
  },
];

const getCategoryBadgeType = (category) => {
  const badgeTypes = {
    'Privacy Compliance': BadgeTypes.ERROR,
    'Consent Management': BadgeTypes.PRIMARY,
    'User Management': BadgeTypes.SUCCESS,
    'Data Governance': BadgeTypes.WARNING,
  };
  return badgeTypes[category] || BadgeTypes.GRAY;
};

const TemplateSelector = ({ open, onClose, onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const modalId = useMemo(() => 'template-selector-modal', []);

  useEffect(() => {
    if (open) {
      // Simulate API call
      setLoading(true);
      setTimeout(() => {
        setTemplates(mockTemplates);
        setLoading(false);
      }, 500);
    } else {
      setSelectedTemplate(null);
    }
  }, [open]);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const handleContinue = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
    }
  };

  const modalButtons = [
    {
      id: 'cancel',
      type: ButtonTypes.SECONDARY,
      label: 'Cancel',
    },
    {
      id: 'continue',
      type: ButtonTypes.PRIMARY,
      label: 'Continue with Template',
      disabled: !selectedTemplate,
    },
  ];

  const handleButtonClick = (buttonId) => {
    if (buttonId === 'cancel') {
      onClose();
    } else if (buttonId === 'continue') {
      handleContinue();
    }
  };

  return (
    <Modal
      open={open}
      type={ModalTypes.DEFAULT}
      header="Select a Template"
      description="Choose a template to start building your sequence. You can customize it after selection."
      onClose={onClose}
      showClose={true}
      buttons={modalButtons}
      onButtonClick={handleButtonClick}
      id={modalId}
      className="template-selector-modal"
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
          <Loading loaderMsgProps={{ loaderMsg: 'Loading templates...' }} />
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          padding: '8px 0',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {templates.map((template) => (
            <Card
              key={template.id}
              text={template.name}
              supportingTexts={[template.description]}
              renderIcon={getRenderIcon(GitBranch)}
              useFeaturedIcon={true}
              type={selectedTemplate?.id === template.id ? CardTypes.PRIMARY : CardTypes.DEFAULT}
              isCardClickable={true}
              onCardClick={() => handleSelectTemplate(template)}
              badges={[
                {
                  id: `category-${template.id}`,
                  label: template.category,
                  type: getCategoryBadgeType(template.category),
                  size: BadgeSizes.SMALL,
                },
              ]}
              className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
            >
              <div style={{
                display: 'flex',
                gap: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
                marginTop: '8px',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                <span><strong>{template.nodeCount}</strong> nodes</span>
                <span>Trigger: <strong>{template.trigger}</strong></span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default TemplateSelector;
