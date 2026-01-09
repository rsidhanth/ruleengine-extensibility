import React, { useMemo } from 'react';
import {
  Modal,
  ModalTypes,
  Card,
  CardTypes,
} from '@leegality/leegality-react-component-library';
import Icon from '@leegality/leegality-react-component-library/dist/icon';
import { Plus, Copy } from 'react-feather';

// Icon render helper for Leegality components
const getRenderIcon = (IconComponent) =>
  IconComponent ? ({ size, color }) => <Icon icon={IconComponent} size={size} color={color} /> : null;

const SequenceTypeSelector = ({ open, onClose, onSelectType }) => {
  const modalId = useMemo(() => 'sequence-type-selector-modal', []);

  const handleCardClick = (type) => {
    onSelectType(type);
  };

  return (
    <Modal
      open={open}
      type={ModalTypes.DEFAULT}
      header="Create New Sequence"
      description="Choose how you want to create your sequence"
      onClose={onClose}
      showClose={true}
      id={modalId}
      className="sequence-type-selector-modal"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
        {/* Fresh Sequence Option */}
        <Card
          text="Create Fresh Sequence"
          supportingTexts={['Start from scratch and build your workflow step by step with complete control']}
          renderIcon={getRenderIcon(Plus)}
          useFeaturedIcon={true}
          type={CardTypes.DEFAULT}
          isCardClickable={true}
          onCardClick={() => handleCardClick('fresh')}
          className="sequence-type-card"
        />

        {/* Template Option */}
        <Card
          text="Start from Template"
          supportingTexts={['Choose from pre-built templates and customize them to fit your needs']}
          renderIcon={getRenderIcon(Copy)}
          useFeaturedIcon={true}
          type={CardTypes.DEFAULT}
          isCardClickable={true}
          onCardClick={() => handleCardClick('template')}
          className="sequence-type-card"
        />
      </div>
    </Modal>
  );
};

export default SequenceTypeSelector;
