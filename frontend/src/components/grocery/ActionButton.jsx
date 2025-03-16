import PropTypes from 'prop-types';

const ActionButton = ({ icon, onClick, title, color = 'primary', iconColor }) => (
  <button 
    title={title}
    onClick={onClick}
    className={`text-secondary-dm p-1 rounded hover:text-${color}-dm flex-shrink-0 h-8 w-8 flex items-center justify-center`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icon}
    </svg>
  </button>
);

ActionButton.propTypes = {
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  title: PropTypes.string,
  color: PropTypes.string,
  iconColor: PropTypes.string
};

export default ActionButton; 