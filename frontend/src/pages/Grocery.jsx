import { MAX_NAME_LENGTH } from '../utils/validation';

// Import components
import Notification from '../components/Notification';
import ListRow from '../components/grocery/ListRow';
import ActionButton from '../components/grocery/ActionButton';
import ListEditingModal from '../components/grocery/ListEditingModal';
import ListSelectionModal from '../components/grocery/ListSelectionModal';
import ShareListModal from '../components/grocery/ShareListModal';
import PendingSharesNotification from '../components/grocery/PendingSharesNotification';
import ItemEditingModal from '../components/grocery/ItemEditingModal';
import TagFilterModal from '../components/grocery/TagFilterModal';
import GroceryView from '../components/grocery/GroceryView';

// Import hooks
import { useGroceryController } from '../hooks/grocery/useGroceryController';
import { VIEWS } from '../hooks/grocery/useGroceryInitialization';

export default function Grocery() {
  const {
    // Refs
    newItemInputRef,
    
    // State
    view,
    notification,
    editingList,
    editingListName,
    showListSelection,
    showShareModal,
    showPendingShares,
    editingItem,
    allTags,
    currentTagFilter,
    showTagFilterModal,
    newListName,
    newItem,
    
    // Data
    items,
    masterList,
    currentList,
    combinedLists,
    pendingShares,
    syncNotification,
    
    setNotification,
    setEditingList,
    setEditingListName,
    setShowListSelection,
    setShowShareModal,
    setShowPendingShares,
    setEditingItem,
    setCurrentTagFilter,
    setShowTagFilterModal,
    setNewListName,
    setNewItem,
    
    // Computed values
    determineLoadingState,
    getMenuItems,
    
    // Handlers
    selectList,
    handleCreateList,
    handleShareList,
    handleAcceptShare,
    handleRejectShare,
    handleDeleteTag,
    handleUpdateItem,
    handleDeleteList,
    handleShareListFromListsView,
    handleAddNewItem,
    handleUpdateListName,
    
    // Actions from other hooks
    toggleItem,
    toggleAllItems,
    deleteItem,
    toggleMasterItem,
    toggleAllMasterItems,
    deleteMasterItem,
    clearSyncNotification,
    
    initialView
  } = useGroceryController();

  // Create add item form
  const addItemForm = (view === VIEWS.LIST || view === VIEWS.MASTER) && (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleAddNewItem();
    }}>
      <ListRow
        hover={false}
        leftElement={<div className="h-6 w-6" />}
        text={
          <input
            ref={newItemInputRef}
            type="text"
            placeholder="Add new item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            style={{ fontFamily: 'inherit' }}
            className="w-full py-2 bg-transparent text-lg font-light font-sans text-secondary-dm placeholder:text-secondary-dm/30 border-b border-transparent focus:border-primary focus:outline-none transition-colors"
          />
        }
        rightElements={
          <ActionButton
            title="Add item"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />}
            onClick={handleAddNewItem}
            iconColor="text-green-500"
          />
        }
      />
    </form>
  );

  // Create add list form
  const addListForm = view === VIEWS.LISTS && (
    <form onSubmit={handleCreateList}>
      <ListRow
        hover={false}
        leftElement={<div className="h-6 w-6" />}
        text={
          <input
            type="text"
            placeholder="New list name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            style={{ fontFamily: 'inherit' }}
            className="w-full py-2 bg-transparent text-lg font-light font-sans text-secondary-dm placeholder:text-secondary-dm/30 border-b border-transparent focus:border-primary focus:outline-none transition-colors"
          />
        }
        rightElements={
          <ActionButton
            title="Add list"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />}
            onClick={handleCreateList}
            iconColor="text-green-500"
          />
        }
      />
    </form>
  );

  return (
    <div className="pr-6 md:pr-0 max-w-[calc(100%-24px)] md:max-w-full mx-auto">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}
      
      {syncNotification && (
        <Notification 
          message={syncNotification.message} 
          type={syncNotification.type} 
          onClose={clearSyncNotification} 
        />
      )}

      <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 flex flex-col h-full min-w-0">
        {/* Show pending shares notification if there are any */}
        {showPendingShares && pendingShares.length > 0 && (
          <PendingSharesNotification
            pendingShares={pendingShares}
            onAccept={handleAcceptShare}
            onReject={handleRejectShare}
            onClose={() => setShowPendingShares(false)}
          />
        )}
        
        {/* Main Content */}
        <GroceryView
          // During initialization, use initialView if set, otherwise use view
          view={initialView || view}
          // Lists view props
          combinedLists={combinedLists}
          selectList={selectList}
          setEditingList={setEditingList}
          deleteList={handleDeleteList}
          onShareList={handleShareListFromListsView}
          // List view props
          items={items}
          currentList={currentList}
          toggleItem={toggleItem}
          toggleAllItems={toggleAllItems}
          deleteItem={deleteItem}
          setEditingItem={setEditingItem}
          currentTagFilter={currentTagFilter}
          setCurrentTagFilter={setCurrentTagFilter}
          // Master list props
          masterList={masterList}
          toggleMasterItem={toggleMasterItem}
          toggleAllMasterItems={toggleAllMasterItems}
          deleteMasterItem={deleteMasterItem}
          // Common props
          isLoading={determineLoadingState()}
          menuItems={getMenuItems()}
          addForm={
            view === 'lists' ? addListForm :
            view === 'list' ? addItemForm :
            null
          }
        />
      </div>

      <ListEditingModal
        isOpen={!!editingList}
        listName={editingListName}
        onSave={() => {
          if (editingList) {
            handleUpdateListName(editingList.id, editingListName);
            setEditingList(null);
            setEditingListName('');
          }
        }}
        onCancel={() => {
          setEditingList(null);
          setEditingListName('');
        }}
        onChange={setEditingListName}
      />

      <ListSelectionModal
        isOpen={showListSelection}
        lists={combinedLists}
        onSelect={(listId) => {
          const targetList = combinedLists.find(list => list.id === listId);
          if (targetList) {
            selectList(targetList);
          }
          setShowListSelection(false);
        }}
        onCancel={() => setShowListSelection(false)}
      />

      <ShareListModal
        isOpen={showShareModal}
        listName={currentList?.name || ''}
        isShared={currentList?.is_shared || false}
        onClose={() => setShowShareModal(false)}
        onShare={handleShareList}
      />

      <ItemEditingModal
        isOpen={!!editingItem}
        itemName={editingItem?.name || ''}
        tags={editingItem?.tags || [editingItem?.tag].filter(Boolean) || []}
        allTags={allTags}
        onSave={(updates) => handleUpdateItem(editingItem.id, updates)}
        onCancel={() => setEditingItem(null)}
        onDeleteTag={handleDeleteTag}
      />

      <TagFilterModal
        isOpen={showTagFilterModal}
        onClose={() => setShowTagFilterModal(false)}
        tags={view === VIEWS.LIST 
          ? items?.flatMap(item => item.tags || []) || []
          : masterList?.items?.flatMap(item => item.tags || []) || []
        }
        onSelectTag={setCurrentTagFilter}
      />
    </div>
  );
} 