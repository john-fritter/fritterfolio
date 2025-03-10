import PropTypes from 'prop-types';

const ListRow = ({ leftElement, text, rightElements, onClick, hover = true }) => (
  <div 
    className={`flex items-center min-w-0 px-3 sm:px-4 py-3 gap-2 sm:gap-3 ${hover ? 'hover:bg-gray-50 dark:hover:bg-gray-800/30' : ''} ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div className="w-6 flex-shrink-0">
      {leftElement}
    </div>

    <div className="flex-1 min-w-0">
      {text}
    </div>

    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 pr-2 sm:pr-4">
      {rightElements}
    </div>
  </div>
);

ListRow.propTypes = {
  leftElement: PropTypes.node,
  text: PropTypes.node.isRequired,
  rightElements: PropTypes.node,
  onClick: PropTypes.func,
  hover: PropTypes.bool
};

export default ListRow; 