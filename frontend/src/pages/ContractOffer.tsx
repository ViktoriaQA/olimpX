import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { PLATFORM_CONFIG } from '@/config/platform';

interface ContractSection {
  id: string;
  title: string;
  content: string[];
}

const ContractOffer: React.FC = () => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<string>('');

  const createPlatformLink = () => 
    `<a href="/" style="color: #2563eb !important; text-decoration: none; font-weight: 600;" class="hover:opacity-80" target="_blank" rel="noopener noreferrer">${PLATFORM_CONFIG.displayName}</a>`;

  const sections: ContractSection[] = [
    {
      id: '1',
      title: 'Загальні положення',
      content: [
        `1.1. Даний Договір пубічної оферти (далі – "Договір") є офіційною пропозицією <a href="/" style="color: #2563eb !important; text-decoration: none; font-weight: 600;" className="hover:opacity-80" target="_blank" rel="noopener noreferrer">${PLATFORM_CONFIG.company.name}</a> (далі – "Компанія") укласти договір про надання послуг платформи <a href="/" style="color: #2563eb !important; text-decoration: none; font-weight: 600;" className="hover:opacity-80" target="_blank" rel="noopener noreferrer">${PLATFORM_CONFIG.displayName}</a> (далі – "Послуги") на умовах, викладених нижче.`,
        `1.2. Згідно зі статтею 641 Цивільного кодексу України, у разі прийняття умов цього Договору шляхом реєстрації на платформі <a href="/" style="color: #2563eb !important; text-decoration: none; font-weight: 600;" className="hover:opacity-80" target="_blank" rel="noopener noreferrer">${PLATFORM_CONFIG.displayName}</a>, фізична чи юридична особа, яка приймає цю пропозицію, стає Замовником.`,
        `1.3. Договір набирає чинності з моменту реєстрації Замовника на платформі <a href="/" style="color: #2563eb !important; text-decoration: none; font-weight: 600;" className="hover:opacity-80" target="_blank" rel="noopener noreferrer">${PLATFORM_CONFIG.displayName}</a> та діє до моменту виконання сторонами своїх зобов\'язань.`,
        `1.4. Компанія залишає за собою право вносити зміни до умов цього Договору, повідомляючи Замовника шляхом розміщення нової редакції на платформі <a href="/" style="color: #2563eb !important; text-decoration: none; font-weight: 600;" className="hover:opacity-80" target="_blank" rel="noopener noreferrer">${PLATFORM_CONFIG.displayName}</a>.`
      ]
    },
    {
      id: '2',
      title: 'Предмет Договору',
      content: [
        `2.1. Компанія зобов\'язується надавати Замовнику доступ до платформи <a href="/" style="color: #2563eb !important; text-decoration: none; font-weight: 600;" className="hover:opacity-80" target="_blank" rel="noopener noreferrer">${PLATFORM_CONFIG.displayName}</a> для організації та участі в освітніх змаганнях з програмування.`,
        '2.2. Послуги включають: доступ до системи проведення турнірів, перевірки завдань, статистики результатів, навчальних матеріалів.',
        '2.3. Замовник зобов\'язується сплачувати за Послуги відповідно до обраного тарифного плану у встановлені терміни.'
      ]
    },
    {
      id: '3',
      title: 'Права та обов\'язки сторін',
      content: [
        '3.1. Компанія має право: призупинити надання Послуг у разі порушення Замовником умов Договору; модифікувати функціонал платформи з попереднім повідомленням користувачів.',
        '3.2. Компанія зобов\'язується: забезпечувати належне функціонування платформи; надавати технічну підтримку; захищати персональні дані Замовника.',
        '3.3. Замовник має право: користуватися всіма функціями платформи відповідно до обраного тарифу; отримувати технічну підтримку; вимагати якості надання Послуг.',
        '3.4. Замовник зобов\'язується: не порушувати правила платформи; не використовувати платформу для незаконних цілей; своєчасно сплачувати за Послуги.'
      ]
    },
    {
      id: '4',
      title: 'Вартість Послуг та порядок розрахунків',
      content: [
        '4.1. Вартість Послуг визначається відповідно до тарифних планів, розміщених на платформі «OlimpX».',
        '4.2. Оплата Послуг здійснюється в безготівковій формі через платіжні системи, інтегровані в платформу.',
        '4.3. Послуги надаються на передплаченій основі. Період оплати становить 1 місяць, 3 місяці або 1 рік залежно від обраного тарифу.',
        '4.4. У разі несвоєчасної оплати Компанія має право призупинити надання Послуг до моменту повного погашення заборгованості.'
      ]
    },
    {
      id: '5',
      title: 'Відповідальність сторін',
      content: [
        '5.1. За невиконання або неналежне виконання умов цього Договору сторони несуть відповідальність згідно з чинним законодавством України.',
        '5.2. Компанія не несе відповідальності за тимчасові збої в роботі платформи, пов\'язані з технічними роботами чи обставинами непереборної сили.',
        '5.3. Замовник несе повну відповідальність за збереження своїх логіну та паролю доступу до платформи.',
        '5.4. У разі порушення авторських прав або інших інтелектуальних прав третіх осіб Замовник несе повну матеріальну відповідальність.'
      ]
    },
    {
      id: '6',
      title: 'Конфіденційність',
      content: [
        '6.1. Компанія зобов\'язується не розголошувати персональні дані Замовника, отримані в процесі надання Послуг.',
        '6.2. Персональні дані обробляються відповідно до Закону України «Про захист персональних даних».',
        `6.3. Замовник дає згоду на обробку своїх персональних даних для цілей надання Послуг платформою <a href="/" style="color: #2563eb !important; text-decoration: none; font-weight: 600;" className="hover:opacity-80" target="_blank" rel="noopener noreferrer">${PLATFORM_CONFIG.displayName}</a>.`,
        '6.4. Компанія має право використовувати анонімізовані дані для статистичних аналізів та покращення якості Послуг.'
      ]
    },
    {
      id: '7',
      title: 'Термін дії Договору та порядок його зміни',
      content: [
        `7.1. Даний Договір діє протягом усього періоду використання Замовником послуг платформи <a href="/" style="color: #2563eb !important; text-decoration: none; font-weight: 600;" className="hover:opacity-80" target="_blank" rel="noopener noreferrer">${PLATFORM_CONFIG.displayName}</a>.`,
        '7.2. Замовник має право розірвати Договір в односторонньому порядку, повідомивши Компанію за 7 днів до розірвання.',
        '7.3. Компанія має право розірвати Договір у разі систематичного порушення Замовником умов Договору.',
        `7.4. Зміни до Договору набирають чинності з моменту їх розміщення на платформі <a href="/" style="color: #2563eb !important; text-decoration: none; font-weight: 600;" className="hover:opacity-80" target="_blank" rel="noopener noreferrer">${PLATFORM_CONFIG.displayName}</a>.`
      ]
    },
    {
      id: '8',
      title: 'Вирішення спорів',
      content: [
        '8.1. Усі спори, що виникають з цього Договору, вирішуються шляхом переговорів.',
        '8.2. У разі недосягнення згоди спори передаються на розгляд до суду за місцем знаходження Компанії.',
        '8.3. Чинним законодавством регулюються відносини, не врегульовані цим Договором.',
        '8.4. Всі претензії та скарги розглядаються Компанією протягом 10 робочих днів з моменту їх отримання.'
      ]
    },
    {
      id: '9',
      title: 'Інші умови',
      content: [
        '9.1. Цей Договір є повною згодою між сторонами щодо його предмета і скасовує всі попередні усні або письмові домовленості.',
        '9.2. Жодна із сторін не може передавати свої права та обов\'язки за цим Договором третім особам без письмової згоди іншої сторони.',
        `9.3. Всі повідомлення та повідомлення між сторонами надсилаються електронною поштою або через платформу <a href="/" style="color: #2563eb !important; text-decoration: none; font-weight: 600;" className="hover:opacity-80" target="_blank" rel="noopener noreferrer">${PLATFORM_CONFIG.displayName}</a>.`,
        '9.4. Договір складено українською мовою у двох примірниках, що мають однакову юридичну силу.'
      ]
    },
    // {
    //   id: '10',
    //   title: 'Реквізити Компанії',
    //   content: [
    //     `10.1. ${PLATFORM_CONFIG.company.name}`,
    //     `10.2. Код ЄДРПОУ: ${PLATFORM_CONFIG.company.code}`,
    //     `10.3. ІПН: ${PLATFORM_CONFIG.company.taxNumber}`,
    //     `10.4. Адреса: ${PLATFORM_CONFIG.address}`,
    //     `10.5. Email: ${PLATFORM_CONFIG.email}`,
    //     `10.6. Телефон: ${PLATFORM_CONFIG.phone}`,
    //     `10.7. Банк: ${PLATFORM_CONFIG.company.bank}`,
    //     `10.8. Рахунок: ${PLATFORM_CONFIG.company.account}`
    //   ]
    // }
  ];

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('.contract-section');
      let current = '';
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom >= 100) {
          current = section.id;
        }
      });
      
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const downloadContract = () => {
    const contractContent = sections.map(section => 
      `${section.title}\n${section.content.join('\n')}`
    ).join('\n\n');
    
    const blob = new Blob([contractContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'договір_оферти_olimpx.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back_to_home', 'Повернутися на головну')}
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {t('contract_offer', 'Договір пубічної оферти')}
                </h1>
                <p className="text-gray-600 mt-1">
                  {t('contract_subtitle', PLATFORM_CONFIG.fullName)}
                </p>
              </div>
            </div>
            
            <button
              onClick={downloadContract}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('download_contract', 'Завантажити')}
            </button>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('table_of_contents', 'Зміст договору')}
          </h2>
          <nav className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(`section-${section.id}`)}
                className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeSection === `section-${section.id}`
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{section.id}.</span> {section.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Contract Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="mb-8 pb-6 border-b border-gray-200">
            <p className="text-gray-600 text-sm leading-relaxed">
              <strong>Дата публікації:</strong> 15.03.2026<br />
              <strong>Версія:</strong> 1.0<br />
              <strong>Місце укладення:</strong> м. Київ, Україна
            </p>
          </div>

          {sections.map((section) => (
            <div 
              key={section.id}
              id={`section-${section.id}`}
              className="contract-section mb-12 scroll-mt-24"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {section.id}. {section.title}
              </h3>
              <div className="space-y-4">
                {section.content.map((paragraph, index) => (
                  <p 
                    key={index} 
                    className="text-gray-700 leading-relaxed text-justify"
                    dangerouslySetInnerHTML={{ __html: paragraph }}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center text-gray-600 text-sm">
              <p dangerouslySetInnerHTML={{ 
                  __html: t('contract_footer_note', `Реєструючись на платформі <a href="/" style="color: #2563eb !important; text-decoration: underline; font-weight: 600;" class="hover:opacity-80" target="_blank" rel="noopener noreferrer">${PLATFORM_CONFIG.displayName}</a>, ви підтверджуєте, що ознайомилися з умовами цього Договору та повністю погоджуєтеся з ними.`)
                }}></p>
              <p>
                {t('last_updated', 'Останнє оновлення')}: 15.03.2026
              </p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('contact_info', 'Контактна інформація')}
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">
                <strong>Email:</strong> {PLATFORM_CONFIG.email}
              </p>
              <p className="text-gray-600">
                <strong>Телефон:</strong> {PLATFORM_CONFIG.phone}
              </p>
            </div>
            <div>
              <p className="text-gray-600">
                <strong>Адреса:</strong> {PLATFORM_CONFIG.address}
              </p>
              <p className="text-gray-600">
                <strong>Графік роботи:</strong> Пн-Пт, 9:00-18:00
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractOffer;
