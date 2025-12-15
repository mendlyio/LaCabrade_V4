var instanceIds = bpostData.instanceIds;

function createModal() {
    var modal = document.createElement('div');
    modal.id = 'myModal';
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.zIndex = '1';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.overflow = 'auto';
    modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
    modal.style.fontFamily = 'Arial, sans-serif';

    var modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#fff';
    modalContent.style.margin = '10% auto';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    modalContent.style.width = '60%';
    modalContent.style.maxWidth = '600px';
    modalContent.style.position = 'relative';

    var closeButton = document.createElement('span');
    closeButton.className = 'close';
    closeButton.innerHTML = '&times;';
    closeButton.style.color = '#aaa';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '20px';
    closeButton.style.fontSize = '24px';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = function() {
        modal.style.display = 'none';
    };

    closeButton.onmouseover = function() {
        closeButton.style.color = 'black';
    };

    closeButton.onmouseout = function() {
        closeButton.style.color = '#aaa';
    };

    var form = document.createElement('form');
    form.onsubmit = function(event) {
        handleSubmit(event);
    };

    var titleElement = document.createElement('h2');
    titleElement.id = 'modalTitle';
    titleElement.style.marginBottom = '20px';

    var label = document.createElement('label');
    label.htmlFor = 'nameInput';
    label.innerText = 'Enter new name:';
    label.style.display = 'block';
    label.style.marginBottom = '8px';

    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'nameInput';
    input.name = 'name';
    input.style.width = '100%';
    input.style.padding = '10px';
    input.style.marginBottom = '20px';
    input.style.border = '1px solid #ddd';
    input.style.borderRadius = '4px';

    var hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = 'instanceIdInput';
    hiddenInput.name = 'instance_id';

    var submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.id = 'submitbtn';
    submitButton.innerText = 'Submit';
    submitButton.style.backgroundColor = '#0073aa';
    submitButton.style.color = '#fff';
    submitButton.style.border = 'none';
    submitButton.style.padding = '10px 20px';
    submitButton.style.borderRadius = '4px';
    submitButton.style.cursor = 'pointer';

    submitButton.onmouseover = function() {
        submitButton.style.backgroundColor = '#006799';
    };

    submitButton.onmouseout = function() {
        submitButton.style.backgroundColor = '#0073aa';
    };

    form.appendChild(titleElement);
    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(hiddenInput);
    form.appendChild(submitButton);

    modalContent.appendChild(closeButton);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

function handleClick(event, instanceId) {
    event.preventDefault();
    var modal = document.getElementById('myModal');
    var titleElement = document.getElementById('modalTitle');
    var row = document.querySelector('tr[data-id=\"' + instanceId + '\"]');
    var shippingMethodTitle = row.querySelector('.wc-shipping-zone-method-title a').innerText;

    document.getElementById('instanceIdInput').value = instanceId;
    titleElement.innerText = 'Change Title for: ' + shippingMethodTitle;
    modal.style.display = 'block';
}

function closeModal() {
    var modal = document.getElementById('myModal');
    modal.style.display = 'none';
}

function handleSubmit(event) {
    event.preventDefault();
    var inputValue = document.getElementById('nameInput').value;
    var instanceId = document.getElementById('instanceIdInput').value;

    var xhr = new XMLHttpRequest();
    xhr.open('POST', window.location.href, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            location.reload();
        }
    };
    xhr.send('action=set_title_action&instance_id=' + encodeURIComponent(instanceId) + '&new_title=' + encodeURIComponent(inputValue));

    closeModal();
}

window.onload = function() {
    createModal();

    instanceIds.forEach(function(instanceId) {
        var row = document.querySelector('tr[data-id=\"' + instanceId + '\"]');

        if (row) {
            var anchor = document.createElement('a');
            anchor.textContent = 'Edit Title';
            anchor.href = '#';
            anchor.className = 'wc-shipping-zone-method-settings';
            anchor.style.marginLeft = '10px';
            anchor.onclick = function(event) {
                handleClick(event, instanceId);
            };

            var targetTd = row.querySelector('.wc-shipping-zone-method-title');

            if (targetTd) {
                var wrapper = document.createElement('div');
                wrapper.style.display = 'flex';
                wrapper.style.justifyContent = 'space-between';
                wrapper.style.alignItems = 'center';

                var leftContainer = document.createElement('div');
                while (targetTd.firstChild) {
                    leftContainer.appendChild(targetTd.firstChild);
                }

                wrapper.appendChild(leftContainer);
                wrapper.appendChild(anchor);

                targetTd.innerHTML = '';
                targetTd.appendChild(wrapper);
            }
        }
    });
}

